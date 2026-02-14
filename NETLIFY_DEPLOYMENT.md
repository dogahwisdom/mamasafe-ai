#  Netlify Deployment Guide - Development & Production Workflow

## Perfect Setup for Continuous Development

You can deploy to Netlify **right now** and continue working on features. Netlify will:
- Deploy your current code
- Create preview deployments for every branch/PR
- Keep production separate until you're ready
- Auto-deploy on every push

---

## 🎯 Deployment Strategy

### **Option 1: Branch-Based (Recommended)**
- **Main branch** → Production (when ready)
- **Development branch** → Preview deployments
- **Feature branches** → Automatic previews

### **Option 2: Manual Deploy**
- Deploy manually when ready
- Continue local development
- Push to production when features are complete

---

##  Step-by-Step Deployment

### Step 1: Prepare Your Code

1. **Make sure everything is committed:**
   ```bash
   git add .
   git commit -m "Ready for Netlify deployment"
   ```

2. **Push to GitHub/GitLab/Bitbucket:**
   ```bash
   git push origin main
   ```

---

### Step 2: Deploy to Netlify

#### **Method A: Connect via GitHub (Recommended)**

1. Go to: **https://app.netlify.com/**
2. Sign up/Login (free account works!)
3. Click **"Add new site"** → **"Import an existing project"**
4. Choose **"GitHub"** (or GitLab/Bitbucket)
5. Authorize Netlify to access your repo
6. Select your **mamasafe-ai** repository
7. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Base directory:** (leave empty)
8. Click **"Deploy site"**

#### **Method B: Manual Deploy (Quick Test)**

1. Build your app:
   ```bash
   npm run build
   ```
2. Go to: **https://app.netlify.com/**
3. Drag and drop the `dist` folder
4. Your site is live! (temporary URL)

---

### Step 3: Configure Environment Variables

1. In Netlify dashboard, go to: **Site settings** → **Environment variables**
2. Add these variables:
   ```
   VITE_SUPABASE_URL=https://mxjwsdizjpdwfleebucu.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   TRIAGE_ENGINE_API_KEY=your_triage_key_here
   ```
3. Click **"Save"**
4. **Redeploy** your site (Deploys → Trigger deploy)

---

## 🔄 Development Workflow

### **Continue Working Locally:**

1. **Make changes** in your code
2. **Test locally:** `npm run dev`
3. **Commit and push:**
   ```bash
   git add .
   git commit -m "Add new feature"
   git push origin main
   ```
4. **Netlify auto-deploys** (takes 2-3 minutes)
5. **Preview URL** is generated automatically

### **Work on Features:**

```bash
# Create feature branch
git checkout -b feature/whatsapp-integration

# Make changes
# ... your code ...

# Commit and push
git push origin feature/whatsapp-integration

# Netlify creates preview deployment automatically!
# You get a unique URL like: https://feature-whatsapp--mamasafe.netlify.app
```

---

## 🎯 Production vs Preview

### **Preview Deployments (Automatic)**
- Every branch/PR gets a preview URL
- Perfect for testing features
- Share with team/stakeholders
- Doesn't affect production

### **Production Deployment**
- Only deploys from `main` branch (or branch you choose)
- Set in: **Site settings** → **Build & deploy** → **Production branch**
- Update when you're ready to go live

---

##  Netlify Configuration

I've created `netlify.toml` with:
- Build settings
- SPA routing (redirects)
- Security headers
- Cache optimization

**No additional setup needed!**

---

##  Environment Variables Setup

### In Netlify Dashboard:

1. Go to: **Site settings** → **Environment variables**
2. Add these (get from your `.env.local`):

   ```
   VITE_SUPABASE_URL=https://mxjwsdizjpdwfleebucu.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   TRIAGE_ENGINE_API_KEY=your_key_here
   ```

3. **Important:** 
   - Use **VITE_** prefix for client-side variables
   - Never commit `.env.local` to git
   - Add `.env.local` to `.gitignore`

---

##  Quick Deploy Checklist

- [ ] Code committed and pushed to GitHub
- [ ] `netlify.toml` created (done)
- [ ] `.netlifyignore` created (done)
- [ ] Connect repo to Netlify
- [ ] Set build command: `npm run build`
- [ ] Set publish directory: `dist`
- [ ] Add environment variables
- [ ] Deploy!

---

##  Pro Tips

### **1. Preview URLs**
- Every branch gets a unique preview URL
- Share with team for testing
- Perfect for client demos

### **2. Branch Deploys**
- Work on features in separate branches
- Each branch auto-deploys
- Merge to main when ready for production

### **3. Deploy Previews**
- Pull requests get preview deployments
- Test before merging
- Comment with preview URL

### **4. Production Branch**
- Set `main` as production branch
- Only this branch updates production
- Other branches = previews only

---

## 🎯 Recommended Workflow

```
1. Deploy to Netlify (main branch) → Production URL
2. Continue development locally
3. Create feature branches → Auto preview deployments
4. Test previews
5. Merge to main when ready → Auto production deploy
```

---

##  What You Get

### **Free Tier Includes:**
- 100GB bandwidth/month
- 300 build minutes/month
- Unlimited sites
- Preview deployments
- HTTPS (automatic)
- Custom domain support

---

## 🔄 Update Production Later

When you're ready to push to production:

1. **Merge your feature branch to main:**
   ```bash
   git checkout main
   git merge feature/your-feature
   git push origin main
   ```

2. **Netlify auto-deploys** to production
3. **Done!** Your changes are live

---

## 🆘 Troubleshooting

### Build Fails
- Check build logs in Netlify dashboard
- Verify environment variables are set
- Check `netlify.toml` configuration

### Environment Variables Not Working
- Make sure they start with `VITE_` for client-side
- Redeploy after adding variables
- Check build logs for errors

### Routing Issues
- `netlify.toml` has redirect rules (already configured)
- All routes redirect to `index.html` for SPA

---

## You're Ready!

**Deploy now and continue developing!**

1. Push your code to GitHub
2. Connect to Netlify
3. Add environment variables
4. Deploy!

**Your production site will be live, and you can keep working on features!** 

---

## 🔗 Quick Links

- **Netlify:** https://app.netlify.com/
- **Netlify Docs:** https://docs.netlify.com/
- **Your Site:** (will be provided after deployment)

---

**Deploy now, ship later!** 
