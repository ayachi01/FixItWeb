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
    """Safely extract text from Ollama response."""
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

    print("📩 POST received at /llm/report/")
    print("Fields:", request.POST)
    print("Files:", request.FILES)

    user_message = request.POST.get("message", "")
    image_file = request.FILES.get("image")

    if image_file:
        print(f"✅ Image received: {image_file.name}, size = {image_file.size} bytes")

        # Save and preprocess image
        image_path = os.path.join(UPLOAD_FOLDER, image_file.name)
        with open(image_path, "wb+") as dest:
            for chunk in image_file.chunks():
                dest.write(chunk)

        try:
            # Resize for performance
            image_bytes = resize_image(image_path)

            prompt_img = """
            You are FixIt Felix 🤖, a classroom issue reporting assistant.
            Look at the image and respond ONLY in JSON:
            {
              "item": "chair/table/projector/etc. or null",
              "intent": "broken/missing/problem/faulty or null",
              "notes": "short description under 50 characters"
            }
            """

            response = ollama.chat(
                model="llava:7b",
                messages=[{"role": "user", "content": prompt_img, "images": [image_bytes]}]
            )

            ai_reply = extract_ollama_content(response)
            print("🧠 Raw Ollama image reply:", ai_reply)

            if not ai_reply:
                raise ValueError("Empty AI response for image.")

            try:
                parsed = json.loads(ai_reply)
            except Exception:
                parsed = json.loads(clean_json(ai_reply))

            ticket = {
                "building": None,
                "room": None,
                "item": parsed.get("item"),
                "intent": parsed.get("intent"),
                "notes": limit_notes(parsed.get("notes")),
            }
            ticket = normalize_fields(ticket)

            bot_reply = f"Detected {ticket['intent']} {ticket['item']}. Please provide the building and room number."
            return JsonResponse({"ai_reply": bot_reply, "ticket": ticket})

        except Exception as e:
            logging.error(f"Error analyzing image: {e}")
            return JsonResponse({
                "ai_reply": "⚠️ Could not analyze the image. Please describe the issue instead.",
                "ticket": {},
            })

    # -- Handle text input (fallback) --
    print("💬 No image detected. Processing text message only.")

    conversation = request.session.get("conversation", {
        "ticket": {"building": None, "room": None, "item": None, "intent": None, "notes": None},
        "previewed": False
    })
    ticket = conversation["ticket"]

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
        logging.debug(f"🧠 Raw Ollama text response: {response}")

        ai_reply = extract_ollama_content(response)
        if not ai_reply:
            logging.warning("⚠️ Empty reply, retrying with llama3.2.")
            response = ollama.chat(model="llama3.2", messages=[{"role": "user", "content": prompt}])
            ai_reply = extract_ollama_content(response)

        parsed = json.loads(ai_reply) if ai_reply.strip().startswith("{") else json.loads(clean_json(ai_reply))

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
        logging.error(f"❌ Error in text analysis: {e}")
        bot_reply = "⚠️ Something went wrong, please try again."

    conversation["ticket"] = ticket
    request.session["conversation"] = conversation
    return JsonResponse({"ai_reply": bot_reply, "ticket": ticket})
