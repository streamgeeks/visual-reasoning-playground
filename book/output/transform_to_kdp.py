import re

with open('book.md', 'r', encoding='utf-8-sig') as f:
    content = f.read()

front_matter = """Visual Reasoning AI for Broadcast and ProAV:

Practical AI Automation for Streaming, ProAV, and Live Production

PAUL W RICHARDS

Copyright © 2026 Paul Richards

All rights reserved.

ISBN: 9798266790568

[DEDICATION]{.smallcaps}

To the ProAV and broadcast professionals who understand their craft and are ready to add AI to their toolkit. You know the gear. You know the workflows. You know what your customers need. This book gives you the technology to build what you've always imagined.

[CONTENTS]{.smallcaps}

  ------------------------------
       Acknowledgments     i
  ---- ------------------- -----
  1    Welcome to Visual Reasoning        
  2    Your First Visual Query        
  3    Drawing Detection Boxes        
  4    Visual Reasoning vs. Everything Else        
  5    Models, APIs, and Getting Access        
  6    Your Development Environment        
  7    Auto-Track Any Object        
  8    Smart Counter        
  9    Scene Analyzer        
  10   Zone Monitor        
  11   AI Color Correction        
  12   Audio Fundamentals for Visual Reasoning        
  13   Intent Extraction from Speech        
  14   The Multimodal Fusion System        
  15   OBS Integration        
  16   PTZOptics Advanced Control        
  17   vMix Integration        
  18   What is a Harness?        
  19   Agentic Coding with Cursor        
  20   Applied Ideas Across Industries        
  21   The Future        
  A    Visual Reasoning Playground Reference        
  B    API Quick Reference        
  C    Troubleshooting Guide        
  D    Glossary        
  ------------------------------

[ACKNOWLEDGMENTS]{.smallcaps}

I would like to acknowledge Matthew Davis, Chief Product Engineer at PTZOptics, who helped create the foundation for visual reasoning technology. His vision for connecting AI to PTZ cameras made this book possible.

I also want to thank Brian Mulcahy, whose work on the Visual Reasoning Harness has made these tools accessible to professionals who aren't programmers.

And to the Moondream team—Jay and Vik—for building an open-source vision model that makes all of this affordable and practical for real-world deployments.

"""

content = re.sub(r'^# Part [IVX]+:.*$\n*', '', content, flags=re.MULTILINE)

def transform_chapter(match):
    num = match.group(1)
    title = match.group(2).strip().upper()
    return f'[{num} {title}]{{.smallcaps}}\n'

content = re.sub(r'^#\s*Chapter\s+(\d+):\s*(.+)$', transform_chapter, content, flags=re.MULTILINE)

def transform_appendix(match):
    letter = match.group(1)
    title = match.group(2).strip().upper()
    return f'[APPENDIX {letter} {title}]{{.smallcaps}}\n'

content = re.sub(r'^#\s*Appendix\s+([A-D]):\s*(.+)$', transform_appendix, content, flags=re.MULTILINE)

final_content = front_matter + content

with open('Visual Reasoning AI - KDP Format.md', 'w', encoding='utf-8') as f:
    f.write(final_content)

print("Done!")
