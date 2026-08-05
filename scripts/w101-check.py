#!/usr/bin/env python3
"""W101 数据 一致性 校验"""
import json
import subprocess
import os
os.chdir('/workspace/english-app')

with open('public/data/words.json', 'r', encoding='utf-8') as f:
    words = json.load(f)
print(f"总词数: {len(words)}")

result = subprocess.run(['npx', 'tsx', 'scripts/w101_check.ts'], capture_output=True, text=True, timeout=60)
print("STDOUT:", result.stdout)
if result.returncode != 0:
    print("STDERR:", result.stderr)
