"""Utility functions for text normalization and data processing."""
import re
from typing import Optional


def slug(text: Optional[str]) -> str:
    """
    Normalize text to a clean slug for matching.
    - Convert to lowercase
    - Strip punctuation and extra whitespace
    - Return empty string if None
    """
    if not text:
        return ""

    # Convert to lowercase
    normalized = text.lower()

    # Replace punctuation and special chars with space
    normalized = re.sub(r'[^\w\s]', ' ', normalized)

    # Collapse multiple spaces to single space and strip
    normalized = re.sub(r'\s+', ' ', normalized).strip()

    return normalized
