# DAGGER Development Workflow

## 🏗️ **Architecture Overview**

DAGGER is a **Vercel-dependent** platform that requires cloud deployment for full functionality:

- **❌ Local Development**: UI preview only - no API calls
- **✅ Vercel Deployment**: Full DAGGER functionality 
- **🧪 Testing**: Via staging Vercel deployments

## 🚀 **Development Environments**

### Production
- **URL**: https://dagger.be-part-of.net
- **Branch**: `main`
- **Purpose**: Stable, public-facing DAGGER
- **Deploy**: Automatic on `main` branch push

### Staging/Testing  
- **URL**: `https://dagger-git-[branch-name].vercel.app`
- **Branch**: Any feature branch
- **Purpose**: Testing new features before production
- **Deploy**: Automatic on branch push (Vercel Preview)

### Local Preview
- **URL**: http://localhost:5173
- **Purpose**: UI development only - **NO API FUNCTIONALITY**
- **Use**: Component styling, layout testing only

## 🔄 **Development Workflow**

### 1. **Feature Development**
```bash
# Start new feature
git checkout main
git pull origin main
git checkout -b feature/khaos-v8-prompts

# Local UI development
npm run dev  # Preview UI changes at localhost:5173

# Make changes
# Edit XML prompts, React components, CSS
git add .
git commit -m "Add KHAOS V8.0 Navigator with enhanced branching"
git push origin feature/khaos-v8-prompts
```

### 2. **Testing on Vercel**
```bash
# Push triggers automatic Vercel preview deployment
# Test URL: https://dagger-git-feature-khaos-v8-prompts.vercel.app

# Test full functionality:
# ✅ Enter Claude API key
# ✅ Test new XML prompts
# ✅ Verify animations work
# ✅ Test "The Bar" functionality
# ✅ Check branching and merging
```

### 3. **Production Deployment**
```bash
# After successful testing
git checkout main
git merge feature/khaos-v8-prompts
git push origin main

# Automatic deployment to https://dagger.be-part-of.net
```

## 🧪 **Testing Strategy**

### **Manual Testing Checklist**
Test on Vercel preview deployment:

**Core Functionality:**
- [ ] API key entry and session management
- [ ] Personality selection (Navigator, Specialist, Claude Classic)
- [ ] "The Bar" prompt library access
- [ ] Conversation branching and merging
- [ ] Graph visualization and drag-to-merge
- [ ] Temperature control and extended thinking

**UI/UX:**
- [ ] Welcome screen scrolling
- [ ] Fancy click animations (progress bars → flash)
- [ ] Responsive design on mobile/tablet
- [ ] Dark/light theme switching
- [ ] Visual feedback for all interactions

**XML Prompt System:**
- [ ] All prompts load correctly (check browser console)
- [ ] Personality prompts work in conversations
- [ ] System prompts work in merge operations
- [ ] Backwards compatibility maintained

### **Automated Testing**
```bash
# Run before deployment
npm test        # Non-API functionality tests
npm run lint    # Code quality
npm run build   # Verify build succeeds
```

## 📁 **File Structure for Development**

```
dagger/
├── src/
│   ├── prompts/           # XML-based prompt system
│   │   ├── personality/   # Navigator, Specialist, Claude Classic
│   │   ├── system/        # Synthesizer, Squeezer  
│   │   └── decommissioned/ # Legacy prompts
│   ├── components/        # React components
│   ├── models/           # Data models
│   └── services/         # API and utility services
├── api/
│   └── chat.js           # Vercel serverless function
├── vercel.json           # Production Vercel config
├── vercel.staging.json   # Staging Vercel config
└── DEVELOPMENT.md        # This file
```

## 🎯 **Quick Commands Reference**

```bash
# UI Development
npm install              # Install dependencies
npm run dev             # ❌ UI preview only
npm run build           # ✅ Build for Vercel
npm test               # ✅ Run tests
npm run lint           # ✅ Code quality

# Git Workflow
git checkout -b feature/my-feature   # New feature branch
git commit -m "Description"          # Commit changes
git push origin feature/my-feature   # Triggers Vercel preview

# Testing
# 1. Visit Vercel preview URL
# 2. Test full functionality
# 3. Merge to main when ready

# Production Deploy
git checkout main        # Switch to main
git merge feature/my-feature  # Merge feature
git push origin main     # Deploy to production
```

## 🔧 **XML Prompt Development**

### **Editing Prompts**
```bash
# Edit any XML file
vi src/prompts/personality/khaos-navigator-v7.xml

# Test changes
git commit -m "Update Navigator prompt"
git push origin feature/prompt-updates
# Test on https://dagger-git-feature-prompt-updates.vercel.app
```

### **Creating New Prompts**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<prompt>
  <metadata>
    <id>khaos_creative_v8</id>
    <name>Creative</name>
    <version>8.0</version>
    <category>personality</category>
    <description>Artistic and creative exploration</description>
    <starred>false</starred>
    <isDefault>false</isDefault>
    <usage>branch</usage>
    <created>2024-01-20</created>
    <modified>2024-01-20</modified>
  </metadata>
  
  <systemPrompt>
    <![CDATA[
    You are the KHAOS Creative - an artistic exploration engine...
    ]]>
  </systemPrompt>
  
  <notes>
    <![CDATA[
    Development notes for this prompt...
    ]]>
  </notes>
</prompt>
```

## ⚡ **Emergency Procedures**

### **Production Rollback**
```bash
# If production deployment breaks
git revert HEAD          # Revert last commit
git push origin main     # Deploy rollback

# Or restore from specific commit
git reset --hard <commit-hash>
git push --force origin main
```

### **Staging Environment Issues**
- Create new branch with different name
- Vercel will create fresh preview deployment
- Test on new URL

### **API Key Issues**
- API keys are session-only (browser storage)
- Clear browser data to reset
- Test with fresh incognito window

## 🎉 **Success Metrics**

**Successful Development Cycle:**
1. ✅ Local UI changes preview correctly
2. ✅ Vercel preview deployment works fully
3. ✅ All manual tests pass
4. ✅ Production deployment successful
5. ✅ No regressions in existing functionality

---

## 📞 **Support**

**Production Issues**: Check https://dagger.be-part-of.net
**Development Questions**: Review this document
**Vercel Issues**: Check Vercel dashboard for deployment logs

**DAGGER Development: Cloud-first, testing-focused, production-ready** 🗡️