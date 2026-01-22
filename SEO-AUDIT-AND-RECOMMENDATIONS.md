# SEO Audit & Link Recommendations

**Goal:** Ensure consistent, strategic linking to PTZOptics.com, VisualReasoning.ai, and StreamGeeks.com across all code-examples before GitHub upload.

---

## Current State Summary

### ✅ What's Working Well

| File | PTZOptics | StreamGeeks | VisualReasoning.ai | Moondream |
|------|-----------|-------------|-------------------|-----------|
| `code-examples/README.md` | ✅ Multiple | ✅ Multiple | ❌ Missing | ✅ |
| `code-examples/index.html` | ❌ Missing | ✅ Footer | ❌ Missing | ✅ |
| `PTZOptics-Moondream-Tracker/README.md` | ✅ Credits | ❌ Missing | ❌ Missing | ✅ |
| `05-framing-assistant/README.md` | ✅ API link | ❌ Missing | ❌ Missing | ❌ |
| `05-color-assistant/README.md` | ✅ API link | ❌ Missing | ❌ Missing | ❌ |
| `00-visual-reasoning-harness/README.md` | ✅ API link | ❌ Missing | ❌ Missing | ❌ |

### ❌ What's Missing

**Individual Tool READMEs (01-08) are missing:**
- VisualReasoning.ai link (the main promotional site!)
- PTZOptics.com link (camera purchase opportunity)
- StreamGeeks.com link (education/community)
- Consistent author attribution with links
- Book/course call-to-action

**Main index.html is missing:**
- PTZOptics.com link
- VisualReasoning.ai link

---

## Recommended Changes

### 1. Main README (code-examples/README.md)

**Add VisualReasoning.ai badge after existing badges:**
```markdown
[![VisualReasoning.ai](https://img.shields.io/badge/Learn%20More-VisualReasoning.ai-green)](https://visualreasoning.ai)
```

**Update "Learn More" section to include:**
```markdown
### Official Resources
- [VisualReasoning.ai](https://visualreasoning.ai) - Book, course, and free tools
- [Moondream Documentation](https://docs.moondream.ai) - API reference & guides
- [PTZOptics API 2.0](https://ptzoptics.com/api) - Camera control documentation
- [StreamGeeks Academy](https://streamgeeks.com) - Live streaming education
```

---

### 2. Main index.html (code-examples/index.html)

**Update footer to include all links:**
```html
<div class="footer">
    <p>
        Part of the <strong>Visual Reasoning AI for Broadcast & ProAV</strong> project<br>
        <a href="https://visualreasoning.ai">VisualReasoning.ai</a> | 
        <a href="https://github.com/StreamGeeks/visual-reasoning-playground">GitHub</a> | 
        <a href="https://ptzoptics.com">PTZOptics</a> | 
        <a href="https://streamgeeks.com">StreamGeeks</a> | 
        <a href="https://moondream.ai">Moondream AI</a>
    </p>
    <p style="margin-top: 10px; font-size: 0.85rem;">
        Created by Paul Richards - Co-CEO at <a href="https://ptzoptics.com">PTZOptics</a> | Chief Streaming Officer at <a href="https://streamgeeks.com">StreamGeeks</a>
    </p>
</div>
```

---

### 3. Individual Tool READMEs (Standardized Footer)

**Replace the simple footer in each tool README with this expanded version:**

```markdown
---

## Learn More

**Book & Course:** [VisualReasoning.ai](https://visualreasoning.ai) - Complete guide to Visual Reasoning AI for Broadcast and ProAV

**Resources:**
- [Moondream](https://moondream.ai) - Vision AI powering these tools
- [PTZOptics](https://ptzoptics.com) - PTZ cameras with API control
- [StreamGeeks](https://streamgeeks.com) - Live streaming education

---

*Part of the [Visual Reasoning Playground](../README.md) by [Paul Richards](https://github.com/paulwrichards)*
```

---

### 4. PTZOptics-Moondream-Tracker/README.md

**Update Credits section:**
```markdown
## Credits

- **Visual Reasoning AI**: Learn more at [VisualReasoning.ai](https://visualreasoning.ai)
- **Moondream**: Vision AI by [Moondream AI](https://moondream.ai/)
- **PTZOptics**: Camera control compatible with [PTZOptics](https://ptzoptics.com/) PTZ cameras
- **StreamGeeks**: Education and community at [StreamGeeks](https://streamgeeks.com/)
```

---

## Files Requiring Updates

### High Priority (Most Visible)

| File | Changes Needed |
|------|----------------|
| `code-examples/README.md` | Add VisualReasoning.ai badge and link |
| `code-examples/index.html` | Add PTZOptics + VisualReasoning.ai to footer |
| `PTZOptics-Moondream-Tracker/README.md` | Add VisualReasoning.ai + StreamGeeks to credits |

### Medium Priority (Tool READMEs)

| File | Changes Needed |
|------|----------------|
| `01-scene-describer/README.md` | Replace footer with expanded version |
| `02-detection-boxes/README.md` | Replace footer with expanded version |
| `03-gesture-obs/README.md` | Add full footer section |
| `04-smart-counter/README.md` | Replace footer with expanded version |
| `05-scene-analyzer/README.md` | Replace footer with expanded version |
| `06-zone-monitor/README.md` | Replace footer with expanded version |
| `07-color-assistant/README.md` | Replace footer with expanded version |
| `08-multimodal-fusion/README.md` | Replace footer with expanded version |

### Low Priority (Specialized READMEs)

| File | Changes Needed |
|------|----------------|
| `shared/README.md` | Add standard footer |
| `00-visual-reasoning-harness/README.md` | Add VisualReasoning.ai + StreamGeeks |
| `05-framing-assistant/README.md` | Add VisualReasoning.ai + StreamGeeks |
| `05-color-assistant/README.md` | Add VisualReasoning.ai + StreamGeeks |
| `07-multimodal-studio/README.md` | Add standard footer |

---

## Link Strategy Summary

| Domain | When to Link | Anchor Text Examples |
|--------|--------------|---------------------|
| **VisualReasoning.ai** | Book/course mentions, "Learn more", footers | "VisualReasoning.ai", "the book", "online course" |
| **PTZOptics.com** | Camera mentions, PTZ features, API docs | "PTZOptics", "PTZOptics cameras", "PTZ camera" |
| **PTZOptics.com/api** | Technical/API references | "PTZOptics API 2.0", "camera control documentation" |
| **StreamGeeks.com** | Education, community, author bio | "StreamGeeks", "StreamGeeks Academy" |
| **Moondream.ai** | AI/VLM mentions, API key setup | "Moondream", "Moondream AI" |

---

## SEO Best Practices Applied

1. **Consistent branding** - Same links appear in same positions across all tools
2. **Contextual linking** - PTZOptics linked when cameras mentioned, not forced
3. **Author attribution** - Paul Richards with company affiliations on visible pages
4. **Call-to-action** - VisualReasoning.ai prominently featured for book/course conversion
5. **Badge visibility** - GitHub badges at top of main README for immediate visibility

---

## Implementation Checklist

- [x] Update `code-examples/README.md` - Add VisualReasoning.ai badge ✅
- [x] Update `code-examples/index.html` - Expand footer with all links ✅
- [x] Update `PTZOptics-Moondream-Tracker/README.md` - Add missing links to credits ✅
- [x] Update all 8 tool READMEs with standardized footer ✅
- [x] Update shared/README.md with footer ✅
- [ ] Verify all links work before push

---

## Summary of Changes Made

| File | Changes |
|------|---------|
| `README.md` | Added VisualReasoning.ai badge, "Get the Book" section with link to /book |
| `index.html` | Added book CTA, PTZOptics link, VisualReasoning.ai link, author attribution links |
| `PTZOptics-Moondream-Tracker/README.md` | Added "Get the Book" section, StreamGeeks to credits |
| `01-scene-describer/README.md` | Added standardized footer with all 4 resource links |
| `02-detection-boxes/README.md` | Added standardized footer with all 4 resource links |
| `03-gesture-obs/README.md` | Added standardized footer with all 4 resource links |
| `04-smart-counter/README.md` | Added standardized footer with all 4 resource links |
| `05-scene-analyzer/README.md` | Added standardized footer with all 4 resource links |
| `06-zone-monitor/README.md` | Added standardized footer with all 4 resource links |
| `07-color-assistant/README.md` | Added standardized footer with all 4 resource links |
| `08-multimodal-fusion/README.md` | Added standardized footer with all 4 resource links |
| `shared/README.md` | Added standardized footer with all 4 resource links |

**Total: 26 new VisualReasoning.ai links across 12 files**

---

*Last updated: January 2026*
