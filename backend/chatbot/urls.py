from openai import OpenAI
import os

client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

def categorize_issue(description):
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Categorize this issue as plumbing, electrical, structural, equipment, or other."},
                {"role": "user", "content": description}
            ]
        )
        category = response.choices[0].message.content.lower()
        return category if category in ['plumbing', 'electrical', 'structural', 'equipment', 'other'] else 'other'
    except Exception:
        return 'other'

def detect_urgency(description):
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Determine urgency as low, medium, or high based on the issue description."},
                {"role": "user", "content": description}
            ]
        )
        urgency = response.choices[0].message.content.lower()
        return urgency if urgency in ['low', 'medium', 'high'] else 'low'
    except Exception:
        return 'low'

def detect_sentiment(description):
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Analyze sentiment (0.0 negative to 1.0 positive) of this description."},
                {"role": "user", "content": description}
            ]
        )
        score = float(response.choices[0].message.content)
        return max(0.0, min(1.0, score))
    except Exception:
        return None
