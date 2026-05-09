# ⚙️ Setup Guide - GitHub Repository AI Q&A System

Complete configuration guide for the n8n workflow backend. This guide assumes you already have n8n running.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pinecone Setup](#pinecone-setup)
3. [Google Gemini API Setup](#google-gemini-api-setup)
4. [GitHub API Setup](#github-api-setup)
5. [n8n Workflow Configuration](#n8n-workflow-configuration)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)
8. [Production Deployment](#production-deployment)

---

## 🔧 Prerequisites

Before you begin, ensure you have:

- ✅ **n8n instance** running (Cloud or self-hosted)
- ✅ **GitHub account** (for API access)
- ✅ **Google account** (for Gemini API)
- ✅ **45 minutes** for complete setup

---

## 🗄️ Pinecone Setup

Pinecone is the vector database that stores code embeddings for semantic search.

### **Step 1: Create Pinecone Account**

1. Go to [pinecone.io](https://www.pinecone.io)
2. Click **"Start Free"**
3. Sign up with email or GitHub
4. Verify your email address

**Free Tier Includes:**
- 100,000 vectors
- 1 index
- Serverless (no infrastructure management)
- Perfect for testing and small-medium repos

---

### **Step 2: Create a Pinecone Index**

1. **Log into Pinecone Console**
   - Dashboard: [app.pinecone.io](https://app.pinecone.io)

2. **Click "Create Index"**

3. **Configure Index Settings:**

   ```yaml
   Index Name: github-repo-qa
   # Or any name you prefer, but remember it!
   
   Dimensions: 768
   # CRITICAL: Google Gemini embeddings are 768-dimensional
   # OpenAI would be 1536, but we're using Gemini
   
   Metric: cosine
   # Best for semantic similarity
   
   Cloud Provider: AWS or GCP
   # Choose based on your location for lower latency
   
   Region: us-east-1 (or closest to you)
   # Select region nearest to your n8n instance
   ```

4. **Choose "Serverless"** (recommended for free tier)

5. **Click "Create Index"**

**⏱️ Index creation takes 1-2 minutes**

---

### **Step 3: Get Your API Key**

1. **In Pinecone Console**, go to **"API Keys"** (left sidebar)
2. Click **"Create API Key"**
3. Name it: `n8n-github-assistant`
4. Copy the key: `pcsk_xxxxx...`

**🔒 IMPORTANT**: Save this key securely - you can't view it again!

**Save for later:**
```
PINECONE_API_KEY=pcsk_xxxxx...
PINECONE_INDEX_NAME=github-repo-qa
```

---

### **Step 4: Verify Index is Ready**

1. Go to **"Indexes"** in Pinecone Console
2. Check that `github-repo-qa` shows status: **"Ready"**
3. Note the **Environment** and **Host** (auto-configured in Serverless)

✅ **Pinecone is now ready!**

---

## 🤖 Google Gemini API Setup

Google Gemini provides FREE embeddings and chat - no credit card required!

### **Step 1: Create Google Account** (if needed)

1. Go to [Google AI Studio](https://aistudio.google.com)
2. Sign in with your Google account

---

### **Step 2: Get API Key**

1. In Google AI Studio, click **"Get API Key"** (top right)
2. Click **"Create API Key"**
3. Select **"Create API key in new project"** (or use existing project)
4. Copy the key: `AIzaSy...`

**🎉 FREE Tier Includes:**
- 1,500 requests per day
- 1 million tokens per day
- Rate limit: 15 requests per minute
- Embeddings: FREE forever
- Gemini 2.0 Flash: FREE

**Save for later:**
```
GOOGLE_GEMINI_API_KEY=AIzaSy...
```

---

## 🐙 GitHub API Setup

GitHub API allows fetching repository content.

### **Step 1: Create Personal Access Token**

1. Go to [GitHub Settings → Developer Settings → Personal Access Tokens → Tokens (classic)](https://github.com/settings/tokens)
2. Click **"Generate new token (classic)"**
3. Configure token:

   ```yaml
   Note: n8n GitHub Repository Assistant
   Expiration: No expiration (or 90 days)
   
   Scopes:
   ✅ repo (Full control of private repositories)
      - Required for both public AND private repos
      - Allows reading repository contents
   ```

4. Click **"Generate token"**
5. Copy the token: `ghp_...`

**🔒 CRITICAL**: Save this token immediately - you can't view it again!

**Save for later:**
```
GITHUB_TOKEN=ghp_...
```

---

### **Step 2: Test GitHub Token** (optional)

Verify your token works:

```bash
curl -H "Authorization: token ghp_YOUR_TOKEN" \
  https://api.github.com/repos/facebook/react/git/trees/main?recursive=1
```

You should see JSON with repository files. If you get 401/403, regenerate the token.

---

## 🔧 n8n Workflow Configuration

Now configure the n8n workflow with your credentials.

### **Step 1: Import Workflow**

1. **Open n8n**
2. Click **"Import from File"** or **"Import from URL"**
3. Select the workflow JSON file
4. Workflow appears with ~20 nodes

---

### **Step 2: Configure Webhook URLs**

The workflow has two webhooks that need proper URLs.

#### **Webhook 1: Repository Indexing** (`/get_github_url`)

1. Click on **"Webhook"** node (first node, top workflow)
2. Note the **"Webhook URL"** shown
   - Example: `https://your-n8n.com/webhook-test/get_github_url`
3. **Copy this URL** - you'll need it for frontend configuration

#### **Webhook 2: Chat Q&A** (`/get_user_query`)

1. Click on **"Webhook1"** node (first node, bottom workflow)
2. Note the **"Webhook URL"** shown
   - Example: `https://your-n8n.com/webhook-test/get_user_query`
3. **Copy this URL** - you'll need it for frontend configuration

**Important:** Make sure **"Allowed Origins"** is set to `*` in both webhooks (or your frontend domain)

---

### **Step 3: Add GitHub Credentials**

**Two nodes need GitHub credentials:**
- **HTTP Request** (fetches repository tree)
- **Get a file** (fetches individual files)

#### **Configure HTTP Request Node:**

1. Click on **"HTTP Request"** node
2. Under **"Authentication"**, select **"Predefined Credential Type"**
3. Choose **"GitHub OAuth2 API"**
4. Click **"Create New Credential"**
5. Configure:
   ```yaml
   Credential Name: GitHub API
   
   Authentication Method: Access Token
   Access Token: ghp_YOUR_TOKEN_HERE
   ```
6. Click **"Save"**

#### **Configure Get a file Node:**

1. Click on **"Get a file"** node
2. Use the **SAME credential** you just created
3. If it asks, select **"GitHub account"** from dropdown

---

### **Step 4: Add Google Gemini Credentials**

**Three nodes need Gemini credentials:**
- **Embeddings Google Gemini** (indexing workflow)
- **Google Gemini Chat Model** (chat workflow)
- **Embeddings Google Gemini1** (chat workflow)

#### **Configure Embeddings (Indexing):**

1. Click on **"Embeddings Google Gemini"** node
2. Click **"Create New Credential"**
3. Select **"Google PaLM API"** (works for Gemini)
4. Enter:
   ```yaml
   Credential Name: Google Gemini API
   API Key: AIzaSy_YOUR_KEY_HERE
   ```
5. Click **"Save"**

#### **Configure Chat Model:**

1. Click on **"Google Gemini Chat Model"** node
2. Use the **SAME credential** you just created
3. Verify **Model** is set to `gemini-2.0-flash-exp` (or latest)

#### **Configure Embeddings (Chat):**

1. Click on **"Embeddings Google Gemini1"** node
2. Use the **SAME credential**

---

### **Step 5: Add Pinecone Credentials**

**Two nodes need Pinecone credentials:**
- **Pinecone Vector Store** (indexing workflow)
- **Pinecone Vector Store1** (chat workflow)

#### **Configure Pinecone (Indexing):**

1. Click on **"Pinecone Vector Store"** node
2. Click **"Create New Credential"**
3. Select **"Pinecone API"**
4. Enter:
   ```yaml
   Credential Name: Pinecone API
   API Key: pcsk_YOUR_KEY_HERE
   ```
5. Click **"Save"**
6. In the node settings:
   - **Operation Mode**: `Insert Documents`
   - **Pinecone Index**: Select `github-repo-qa` from dropdown
   - **Namespace**: Leave default (uses repository name dynamically)

#### **Configure Pinecone (Chat):**

1. Click on **"Pinecone Vector Store1"** node
2. Use the **SAME credential**
3. In the node settings:
   - **Operation Mode**: `Retrieve Documents (As Tool for AI Agent)`
   - **Pinecone Index**: Select `github-repo-qa`
   - **Tool Description**: (already configured)
   - **Limit**: `10` (retrieves top 10 code chunks)
   - **Include Metadata**: `ON` ✅

---

### **Step 6: Configure Document Splitter**

The **Default Data Loader** node splits code into chunks.

1. Click on **"Default Data Loader"** node
2. Verify settings:
   ```yaml
   JSON Mode: Expression Data
   JSON Data: ={{ $json.pageContent }}
   
   Text Splitting Mode: Custom
   Text Splitter: Connected to "Token Splitter" sub-node
   
   Metadata:
     - file_extension: ={{ $('Wait').item.json.file_extension }}
     - file_path: ={{ $('Wait').item.json.metadata.file_path }}
     - repository: ={{ $('Wait').item.json.metadata.repository }}
     - branch: ={{ $('Wait').item.json.metadata.branch }}
   ```

3. Click on **"Token Splitter"** sub-node (connected to Data Loader)
4. Verify settings:
   ```yaml
   Chunk Size: 20000 tokens
   # Large chunks preserve code context
   
   Chunk Overlap: 2000 tokens
   # Overlap ensures no information loss at boundaries
   ```

**Why these values?**
- 20K tokens ≈ 60-80K characters
- Keeps related code together (functions, classes)
- Overlap prevents splitting critical code sections

---

### **Step 7: Configure AI Agent System Prompt**

The **AI Agent** node contains the prompt that guides responses.

1. Click on **"AI Agent"** node
2. Review **"System Message"** (already configured)
3. **Optional**: Customize for your use case

**Default prompt location**: See [PROMPTS.md](./PROMPTS.md) for full text and customization guide.

---

### **Step 8: Activate Workflow**

1. Click **"Active"** toggle (top right) to **ON**
2. Workflow status should show ✅ **"Active"**

**Both webhooks are now live!**

---

## 🧪 Testing

### **Test 1: Verify Webhook Endpoints**

```bash
# Test indexing webhook
curl https://your-n8n.com/webhook-test/get_github_url

# Should return: Workflow is waiting for webhook trigger
```

---

### **Test 2: Index a Small Repository**

Use a small public repository for initial testing:

```bash
curl -X POST "https://your-n8n.com/webhook-test/get_github_url" \
  -H "Content-Type: application/json" \
  -d '{
    "github_url": "https://github.com/pallets/flask",
    "branch": "main"
  }'
```

**Expected Response:**
```json
{
  "Success_message": "All Files are been fetched and added to Pinecone Database"
}
```

**⏱️ Time**: ~5-10 minutes for Flask repo (~100 files)

---

### **Test 3: Verify Pinecone Has Data**

1. Go to **Pinecone Console**
2. Click on **"github-repo-qa"** index
3. Check **"Vectors"** count
   - Should show 200-500 vectors (Flask repo example)
4. Check **"Namespaces"**
   - Should show: `pallets-flask`

✅ **Indexing successful!**

---

### **Test 4: Ask a Question**

```bash
curl -X POST "https://your-n8n.com/webhook-test/get_user_query" \
  -H "Content-Type: application/json" \
  -d '{
    "user_query": "What is Flask?",
    "user_session_id": "test_session_123"
  }'
```

**Expected Response:**
```json
{
  "output": "Flask is a lightweight WSGI web application framework for Python. It's designed to make getting started quick and easy, with the ability to scale up to complex applications..."
}
```

**⏱️ Response Time**: 3-8 seconds

✅ **Chat working!**

---

### **Test 5: Verify Session Memory**

Ask a follow-up question using the **same session ID**:

```bash
curl -X POST "https://your-n8n.com/webhook-test/get_user_query" \
  -H "Content-Type: application/json" \
  -d '{
    "user_query": "Can you show me the code?",
    "user_session_id": "test_session_123"
  }'
```

The AI should understand "the code" refers to Flask code from previous question.

✅ **Memory working!**

---

## 🐛 Troubleshooting

### **Issue #1: "Credential authentication failed"**

**Symptoms:**
- Node shows red error
- Message: "Authentication failed"

**Solutions:**

✅ **For GitHub:**
- Verify token has `repo` scope
- Check token hasn't expired
- Regenerate token if needed

✅ **For Gemini:**
- Verify API key starts with `AIzaSy`
- Check you didn't copy extra spaces
- Ensure API is enabled in Google Cloud Console

✅ **For Pinecone:**
- Verify API key format: `pcsk_...`
- Check you're using correct environment
- Regenerate key in Pinecone Console

---

### **Issue #2: "Index not found" (Pinecone)**

**Symptoms:**
- Error: "Index 'github-repo-qa' does not exist"

**Solutions:**

✅ **Check index name:**
1. Go to Pinecone Console
2. Verify exact index name (case-sensitive!)
3. Update in n8n if needed:
   - **Pinecone Vector Store** node → **Pinecone Index**
   - **Pinecone Vector Store1** node → **Pinecone Index**

✅ **Verify index is ready:**
- Index status must be "Ready" (not "Initializing")

---

### **Issue #3: "Dimension mismatch" (Pinecone)**

**Symptoms:**
- Error: "Dimension of vectors (768) does not match index dimension (1536)"

**Cause:**
- Index created with wrong dimensions

**Solutions:**

✅ **Option 1: Recreate index** (recommended)
1. Delete existing index in Pinecone Console
2. Create new index with **Dimensions: 768**

✅ **Option 2: Switch to OpenAI Embeddings**
1. Change embeddings to OpenAI (dimensions: 1536)
2. Update credentials
3. Re-index repository

**Note**: Google Gemini = 768 dimensions, OpenAI = 1536 dimensions

---

### **Issue #4: "Repository not found" (GitHub)**

**Symptoms:**
- Error: "404 Not Found"
- GitHub API returns repository doesn't exist

**Solutions:**

✅ **For public repos:**
- Verify URL is correct
- Check repository name spelling
- Ensure repository is public

✅ **For private repos:**
- Verify token has `repo` scope (full access)
- Check you have access to the repository
- Owner and collaborator access both work

---

### **Issue #5: No vectors in Pinecone after indexing**

**Symptoms:**
- Indexing completes successfully
- But Pinecone shows 0 vectors

**Solutions:**

✅ **Check Data Loader output:**
1. Click on **Default Data Loader** node
2. Click **"Execute Node"**
3. Verify output shows `pageContent` with actual code

✅ **Check Token Splitter:**
- Chunk Size: Should be 20000
- Connected properly to Data Loader

✅ **Check embeddings generation:**
1. Click on **Embeddings Google Gemini** node
2. Execute node
3. Should generate 768-dimensional vectors

✅ **Check Pinecone connection:**
- Verify credentials
- Check index name is correct
- Ensure namespace is being set

---

### **Issue #6: AI responses are generic/unhelpful**

**Symptoms:**
- AI doesn't reference specific files
- Responses don't include code snippets
- Says "I don't have access to that information"

**Solutions:**

✅ **Verify retrieval is working:**
1. Click on **Pinecone Vector Store1** node (chat workflow)
2. Check **Limit**: Should be 10
3. Verify **Include Metadata**: Should be ON

✅ **Check AI Agent Tool:**
- Tool Description should be configured
- Pinecone should be connected as tool
- Embeddings should match (same Gemini credential)

✅ **Test retrieval manually:**
- In Pinecone Console, try a query
- Verify vectors are searchable
- Check metadata is present

---

### **Issue #7: Rate limit errors**

**Symptoms:**
- Error: "Rate limit exceeded"
- API failures during indexing

**Causes:**
- Too many GitHub API calls
- Gemini API limits (15 req/min)

**Solutions:**

✅ **For GitHub:**
- Wait node already adds 1-second delay
- Increase to 2 seconds if still hitting limits
- Check GitHub API rate limit status:
  ```bash
  curl -H "Authorization: token YOUR_TOKEN" \
    https://api.github.com/rate_limit
  ```

✅ **For Gemini:**
- Free tier: 15 requests/minute
- Wait a few minutes and retry
- Large repos may need patience

---

### **Issue #8: Frontend can't reach webhooks**

**Symptoms:**
- CORS errors in browser console
- Network timeout errors

**Solutions:**

✅ **Enable CORS in webhooks:**
1. **Webhook** node → **Options** → **Allowed Origins** → `*`
2. **Webhook1** node → **Options** → **Allowed Origins** → `*`

✅ **For production:**
Replace `*` with your frontend domain:
```
https://your-frontend.com
```

✅ **Verify URLs are accessible:**
```bash
curl https://your-n8n.com/webhook-test/get_github_url
# Should not return 404
```

---

## 🚀 Production Deployment

### **Step 1: Secure Your n8n Instance**

#### **For n8n Cloud:**
- Already secured ✅

#### **For Self-Hosted:**

1. **Enable HTTPS:**
   - Use reverse proxy (Caddy, nginx)
   - Get SSL certificate (Let's Encrypt)

2. **Restrict webhook access:**
   - Set specific **Allowed Origins** (not `*`)
   - Use authentication if needed

3. **Environment variables:**
   - Don't hardcode credentials
   - Use n8n environment variables

---

### **Step 2: Configure Frontend**

Update your Lovable frontend with production webhook URLs:

```javascript
// In your frontend config
const API_BASE_URL = 'https://your-n8n.com/webhook-test';

const ENDPOINTS = {
  indexRepository: `${API_BASE_URL}/get_github_url`,
  chat: `${API_BASE_URL}/get_user_query`
};
```

---

### **Step 3: Monitor API Usage**

Set up monitoring for API quotas:

**Pinecone:**
- Free tier: 100,000 vectors
- Monitor in Pinecone Console
- Set up billing alerts

**Google Gemini:**
- Free tier: 1M tokens/day
- Check [AI Studio](https://aistudio.google.com)
- Monitor rate limits (15 req/min)

**GitHub:**
- 5,000 requests/hour authenticated
- Check: `https://api.github.com/rate_limit`

---

### **Step 4: Backup Strategy**

#### **Backup Workflow:**
1. In n8n, click hamburger menu → **"Download"**
2. Save JSON file
3. Store in version control (Git)

#### **Backup Pinecone:**
- Pinecone automatically backs up
- To migrate: Export via API and re-import

#### **Backup Prompts:**
- Store prompts in [PROMPTS.md](./PROMPTS.md)
- Version control all prompt changes

---

### **Step 5: Performance Optimization**

#### **For Large Repositories (500+ files):**

1. **Increase batch processing:**
   - Edit **Loop Over Items** → **Batch Size** → `1` (current)
   - Keep at 1 for memory efficiency

2. **Adjust chunk size:**
   - For very large files, reduce to 15000 tokens
   - For small files, increase to 30000 tokens

3. **Increase retrieval limit:**
   - **Pinecone Vector Store1** → **Limit** → `15`
   - More context for complex queries

#### **For Faster Responses:**

1. **Reduce retrieval limit:**
   - **Limit** → `5` (less context, faster)

2. **Use smaller model:**
   - Gemini Flash is already fastest
   - No need to change

---

## ✅ Setup Checklist

Before going live, verify:

- [ ] n8n instance accessible
- [ ] Pinecone index created (768 dimensions, cosine metric)
- [ ] Pinecone API key added to n8n
- [ ] Google Gemini API key added to n8n
- [ ] GitHub Personal Access Token created with `repo` scope
- [ ] GitHub credentials added to both HTTP Request and Get a file nodes
- [ ] Gemini credentials added to all 3 embedding/chat nodes
- [ ] Pinecone credentials added to both vector store nodes
- [ ] Document Splitter configured (20K tokens, 2K overlap)
- [ ] AI Agent system prompt reviewed
- [ ] Workflow activated in n8n
- [ ] Webhook URLs copied for frontend
- [ ] CORS enabled on both webhooks
- [ ] Test repository indexed successfully
- [ ] Vectors visible in Pinecone Console
- [ ] Test query returns relevant code
- [ ] Session memory working across messages
- [ ] Frontend connected to webhook URLs
- [ ] Production domain configured (if applicable)
- [ ] Monitoring set up for API usage
- [ ] Backup strategy implemented

---

## 🎉 You're Ready!

Setup complete! Your GitHub Repository AI Q&A system is now ready for production use.

**Next Steps:**
1. Test with your own repositories
2. Share with your team
3. Customize prompts for specific use cases
4. Monitor API usage and costs
5. Gather feedback and iterate

**Questions?** Review:
- [README.md](./README.md) for overview
- [PROMPTS.md](./PROMPTS.md) for prompt customization
- This guide for troubleshooting

---

**Congratulations on setting up your intelligent GitHub repository assistant! 🎊**
