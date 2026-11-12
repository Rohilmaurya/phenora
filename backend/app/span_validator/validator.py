from typing import Optional, Tuple


def validate_span(note_text: str, start: int, end: int, quote: str) -> Tuple[bool, Optional[str]]:
    """Validates that a quoted mention corresponds exactly to the Unicode code-point span in the note.
    
    Zero-based Unicode code-point indexing, end-exclusive.
    """
    if start < 0:
        return False, f"Start offset ({start}) cannot be negative"
    if end <= start:
        return False, f"End offset ({end}) must be strictly greater than start ({start})"
    if end > len(note_text):
        return False, f"End offset ({end}) exceeds note length ({len(note_text)})"

    actual_substring = note_text[start:end]
    if actual_substring != quote:
        return False, f"Quote mismatch: expected {quote!r}, found {actual_substring!r}"

    return True, None
