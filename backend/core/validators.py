from django.core.exceptions import ValidationError

def validate_file_size(file, max_mb=5):
    limit = max_mb * 1024 * 1024
    if file.size > limit:
        raise ValidationError(f"File too large. Max size is {max_mb} MB.")

def validate_image_extension(file):
    valid_extensions = [".jpg", ".jpeg", ".png"]
    import os
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in valid_extensions:
        raise ValidationError("Unsupported file extension. Allowed: jpg, jpeg, png.")

def validate_proof_file(file):
    valid_extensions = [".jpg", ".jpeg", ".png", ".pdf"]
    import os
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in valid_extensions:
        raise ValidationError("Unsupported proof file. Allowed: jpg, jpeg, png, pdf.")
