# Deployment Guide for University Servers

This guide explains how to deploy the Imagemap to a university server or any static web hosting.

## ✅ Why This Works on University Servers

This is a **100% static website**:
- No server-side code needed
- No Node.js, PHP, or Python required
- No database needed
- Just HTML, CSS, JavaScript, and images
- Works on any web server (Apache, Nginx, IIS, etc.)

## 📤 Deployment Steps

### Step 1: Export Your Files

1. Open the editor in your browser
2. Make all your edits
3. Click **"💾 Save Locally"** to save changes
4. Click **"📥 Export Files"** to download:
   - `data.xml`
   - `images.json`
   - `UPLOAD_INSTRUCTIONS.txt`

### Step 2: Prepare Files for Upload

You need to upload these files to your university server:

```
imagemap/
├── index.html              ← Main page
├── editor.html             ← Editor page
├── app.js                  ← Main script
├── editor.js               ← Editor script
├── main.css                ← Main styles
├── editor.css              ← Editor styles
├── data.xml                ← Your configuration (use exported)
├── images.json             ← Image manifest (use exported)
└── images/                 ← All your images
    ├── item-1.jpg
    ├── item-2.jpg
    └── ... (all images)
```

### Step 3: Upload to University Server

#### Option A: Using FTP Client (Recommended)

1. Download FileZilla or WinSCP
2. Connect to your university server:
   - Host: `ftp.youruni.edu` (ask IT)
   - Username: Your university username
   - Password: Your university password
3. Navigate to `public_html/` folder
4. Create a new folder: `imagemap/`
5. Drag and drop all files into this folder
6. Wait for upload to complete

#### Option B: Using Web-Based File Manager

1. Log into your university's hosting control panel
2. Go to File Manager
3. Create new folder: `imagemap/`
4. Upload files one by one or in groups
5. Verify all files are uploaded

#### Option C: Using Command Line (Advanced)

```bash
# Using SCP (if your server supports it)
scp -r imagemap/* username@yourserver.edu:~/public_html/imagemap/

# Or using SFTP
sftp username@yourserver.edu
# Then: put -r imagemap/* public_html/imagemap/
```

### Step 4: Set File Permissions

Most servers automatically set correct permissions, but if needed:

1. Right-click each folder → Properties
2. Set permissions:
   - Files: 644 (read/write for owner, read for others)
   - Folders: 755 (full access for owner, read for others)
3. Apply recursively

### Step 5: Verify Deployment

1. Open your browser
2. Go to: `http://yourserver.edu/imagemap/index.html`
3. Check:
   - ✓ Images display correctly
   - ✓ Clicking circles shows info
   - ✓ Editor opens
   - ✓ No console errors (F12)

## 🔧 Common Issues & Solutions

### Images Not Showing

**Problem:** Images display as broken links

**Solutions:**
- Check that `images/` folder is uploaded
- Verify image filenames in `images.json`
- Check file permissions on image files (644)
- Try clearing browser cache (Ctrl+Shift+Delete)
- Check browser console for exact error path

### Editor Not Loading

**Problem:** Editor page is blank

**Solutions:**
- Ensure `editor.html`, `editor.js`, `editor.css` uploaded
- Check file permissions (644 for files)
- Clear browser cache
- Check browser console (F12) for errors
- Verify `data.xml` exists

### Editor Changes Not Saving

**Important:** On university servers, the editor saves only to **browser storage**

- Changes save automatically to browser
- To make changes permanent:
  1. Edit and save locally
  2. Click "📥 Export Files"
  3. Download new `data.xml`
  4. Upload updated `data.xml` back to server
  5. Reload page

### 404 or Access Denied Errors

**Solutions:**
- Ask university IT for correct server address
- Verify your username/password
- Check if your account has file upload permissions
- Try uploading to different location if available

### File Upload Fails

**Solutions:**
- Upload fewer files at once
- Check file size limits (usually 100MB+)
- Verify connection is stable
- Try different FTP client
- Contact IT for quota information

## 🔐 Security Notes

- The editor saves to browser storage (not server)
- `data.xml` is plain text (edit carefully)
- Keep backups of `data.xml` locally
- Don't share editor access if sensitive content

## 📝 Maintaining Your Imagemap

### To Add New Images

1. Upload images to `images/` folder via FTP
2. Edit `images.json` to add new image paths
3. Reload the editor
4. New images appear in image selector

### To Edit Later

**Option A: Edit Locally, Then Upload**
1. Download current `data.xml` from server
2. Open editor locally
3. Import and edit
4. Export new `data.xml`
5. Upload back to server

**Option B: Edit on Server**
1. Access `editor.html` on server
2. Make edits
3. Click "💾 Save Locally"
4. Click "📥 Export Files"
5. Upload updated `data.xml` back to server
6. Reload main page

## 🆘 Getting Help

### University IT Support

Ask them:
- "How do I upload files to public_html?"
- "What's the correct FTP address?"
- "How do I change file permissions?"
- "What's my file upload quota?"

### Browser Issues

- Clear cache: `Ctrl+Shift+Delete` (or `Cmd+Shift+Delete` on Mac)
- Try different browser
- Check console: Press `F12`, go to Console tab
- Look for specific error messages

### File Issues

1. Ensure files are in correct folder
2. Check file names match exactly (case-sensitive on Linux servers)
3. Verify `data.xml` is valid XML
4. Try uploading files one at a time

## 📚 File Reference

| File | Purpose | Uploadable? |
|------|---------|-----------|
| index.html | Main page | ✓ Required |
| app.js | Viewer logic | ✓ Required |
| editor.html | Editor UI | ✓ Required |
| editor.js | Editor logic | ✓ Required |
| main.css | Main styles | ✓ Required |
| editor.css | Editor styles | ✓ Required |
| data.xml | Configuration | ✓ Required |
| images.json | Image list | ✓ Required |
| images/ | Image folder | ✓ Required |
| server.js | Node.js server | ✗ Not needed |
| package.json | Node.js config | ✗ Not needed |

## 🎉 You're Done!

Your imagemap should now be live on your university server. Share the link with others!

Need to make updates? Just edit locally and re-upload `data.xml` and any updated images.

## Quick Reference

```
EDIT LOCALLY:
1. Open index.html → Click ⚙️ → Make changes
2. Save Locally → Export Files
3. Download files to your computer

UPLOAD TO SERVER:
1. Use FTP client to connect
2. Navigate to public_html/
3. Create imagemap/ folder
4. Upload all files
5. Set permissions to 644 (files) / 755 (folders)

VERIFY:
1. Open http://yourserver.edu/imagemap/
2. Test clicking and editing
3. Check browser console (F12) for errors
```
