# llm/views.py
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import ollama
import os, json, logging, re, io
from PIL import Image

# Ensure upload folder exists
UPLOAD_FOLDER = os.path.join(settings.BASE_DIR, "llm", "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
logging.basicConfig(level=logging.DEBUG)


# ---- JSON Cleanup Helper ----
def clean_json(ai_reply: str) -> str:
    ai_reply = re.sub(r"^```[a-zA-Z]*", "", ai_reply)
    ai_reply = re.sub(r"```$", "", ai_reply)
    match = re.search(r"\{.*\}", ai_reply, re.DOTALL)
    if match:
        ai_reply = match.group(0)
    ai_reply = re.sub(r",\s*([\}\]])", r"\1", ai_reply)
    ai_reply = re.sub(r"[^\{\}\[\]\":,a-zA-Z0-9_\s\-]", "", ai_reply)
    ai_reply = re.sub(r'(\s*)([A-Za-z0-9_]+)(\s*):', r'\1"\2"\3:', ai_reply)
    return ai_reply.strip()


def limit_notes(text, max_len=50):
    if not text:
        return None
    text = text.strip()
    if len(text) <= max_len:
        return text
    truncated = text[:max_len]
    if " " in truncated:
        truncated = truncated[:truncated.rfind(" ")]
    return truncated.rstrip() + "..."


def normalize_fields(ticket: dict) -> dict:
    if ticket.get("item"):
        item = ticket["item"].lower()
        if "chair" in item:
            ticket["item"] = "chair"
        elif "desk" in item or "table" in item:
            ticket["item"] = "desk"
        elif "projector" in item:
            ticket["item"] = "projector"

    if ticket.get("intent"):
        intent = ticket["intent"].lower()
        if "broken" in intent:
            ticket["intent"] = "broken"
        elif "missing" in intent:
            ticket["intent"] = "missing"
        elif any(k in intent for k in ["problem", "issue", "faulty", "damaged"]):
            ticket["intent"] = "problem"

    if ticket.get("notes"):
        ticket["notes"] = limit_notes(ticket["notes"])
    return ticket


def resize_image(image_path, max_size=(320, 320)) -> bytes:
    with Image.open(image_path) as img:
        img = img.convert("RGB")
        img.thumbnail(max_size)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=70, optimize=True)
        buf.seek(0)
        return buf.getvalue()


def extract_ollama_content(response):
    """
    Safely extract content from Ollama's response object,
    even if it's streamed or empty.
    """
    if not response:
        return ""
    if isinstance(response, dict):
        msg = response.get("message")
        if isinstance(msg, dict):
            return msg.get("content", "").strip()
        return response.get("content", "").strip()
    elif hasattr(response, "message"):
        return getattr(response.message, "content", "").strip()
    return ""


# ---- Django Views ----

def home(request):
    return render(request, "llm/chat.html")


@csrf_exempt
def report_issue(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)

    user_message = request.POST.get("message", "")
    image_file = request.FILES.get("image")

    conversation = request.session.get("conversation", {
        "ticket": {"building": None, "room": None, "item": None, "intent": None, "notes": None},
        "previewed": False
    })
    ticket = conversation["ticket"]

    # -- Handle text input --
    prompt = f"""
    You are FixIt Felix 🤖, a classroom issue reporting assistant.
    Extract structured data (building, room, item, intent, notes) from this message.
    Keep 'notes' under 50 characters.
    Message: "{user_message}"
    Respond ONLY in JSON:
    {{
      "building": "MBA/PTC/CMA/RS/BE/NH/Library or null",
      "room": "Room 101 / 2nd Floor / etc. or null",
      "item": "chair/table/projector/etc. or null",
      "intent": "broken/missing/problem/faulty or null",
      "notes": "short description under 50 characters"
    }}
    """

    try:
        response = ollama.chat(model="symonvalencia/fixitV2", messages=[{"role": "user", "content": prompt}])
        logging.debug(f"🧠 Raw Ollama response: {response}")

        ai_reply = extract_ollama_content(response)
        if not ai_reply:
            logging.warning("⚠️ Ollama returned an empty reply. Using fallback model (llama3.2).")
            response = ollama.chat(model="llama3.2", messages=[{"role": "user", "content": prompt}])
            ai_reply = extract_ollama_content(response)

        if not ai_reply:
            raise ValueError("No text content returned from Ollama.")

        logging.info(f"✅ AI reply text: {ai_reply}")

        try:
            parsed = json.loads(ai_reply)
        except Exception:
            parsed = json.loads(clean_json(ai_reply))

        for key in ["building", "room", "item", "intent", "notes"]:
            if parsed.get(key):
                val = parsed[key].strip() if isinstance(parsed[key], str) else parsed[key]
                ticket[key] = limit_notes(val) if key == "notes" else val

        ticket = normalize_fields(ticket)
        missing = [k for k, v in ticket.items() if not v]

        if ticket["item"] and ticket["intent"] and ("building" in missing or "room" in missing):
            bot_reply = f"I see, a {ticket['intent']} {ticket['item']}. Can you give me the building and room number?"
        elif missing:
            bot_reply = f"I still need the following details: {', '.join(missing)}."
        else:
            bot_reply = (
                f"✅ Ticket Preview:<br>"
                f"📍 Building: {ticket['building']}<br>"
                f"🏫 Room: {ticket['room']}<br>"
                f"📦 Item: {ticket['item']}<br>"
                f"⚠️ Intent: {ticket['intent']}<br>"
                f"📝 Notes: {ticket['notes']}<br><br>"
                f"Do you want me to submit this ticket? (yes/no)"
            )
            conversation["previewed"] = True

    except Exception as e:
        logging.error(f"❌ Error in report_issue: {e}")
        bot_reply = "⚠️ Something went wrong, please try again."

    conversation["ticket"] = ticket
    request.session["conversation"] = conversation
    return JsonResponse({"ai_reply": bot_reply, "ticket": ticket})
