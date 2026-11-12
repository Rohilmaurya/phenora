#!/usr/bin/env python3
"""Mint a local bearer token for development and synthetic testing."""
import argparse
import sys
import os

# Add parent directory to path so script runs directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.auth.bearer import create_token


def main():
    parser = argparse.ArgumentParser(description="Mint a development bearer token")
    parser.add_argument("--actor", default="dev-operator-01", help="Actor ID (sub claim)")
    parser.add_argument("--role", default="clinician", help="Role (default: clinician)")
    parser.add_argument("--ttl", type=int, default=3600, help="TTL in seconds (default: 3600)")
    args = parser.parse_args()

    token = create_token(actor_id=args.actor, role=args.role, expires_in_seconds=args.ttl)
    print(token)


if __name__ == "__main__":
    main()
