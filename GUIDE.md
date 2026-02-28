# Infographedia Getting Started Guide

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm (`npm install -g pnpm`)
- PostgreSQL database

### Local Development

```bash
# Clone and install
git clone https://github.com/Kesaramb/infographedia.git
cd infographedia
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your database URL and API keys

# Run dev server
pnpm dev
# Open http://localhost:3000
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URI` | PostgreSQL connection string |
| `PAYLOAD_SECRET` | Random secret for Payload CMS auth |
| `ANTHROPIC_API_KEY` | Claude API key for AI generation |

### Seed the Database

```bash
node --env-file=.env --import=tsx scripts/seed.ts
```

This creates 4 sample users and 9 infographic posts with different chart types.

---

## User Roles

| Role | Capabilities |
|------|-------------|
| **User** | View feed, like/save/share posts, create infographics, iterate on existing posts, comment |
| **Admin** | Everything users can do + access admin panel (`/admin`), delete any post, manage users, update AI config |

### Making a User Admin

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

---

## Using the App

### Browsing Infographics
- Scroll the infinite feed on the home page
- Each infographic plays an 8-second animation, then shows the static version
- Click the replay button (top-right of infographic) to watch the animation again
- Tap any post to see the full detail view

### Creating an Infographic
1. Click the **+** button (center of bottom nav)
2. Enter a topic prompt (e.g., "Top programming languages by popularity in 2026")
3. The AI will search the web for real data, then generate a structured infographic
4. Every infographic includes verified sources

### Iterating on an Infographic
1. Open any post's detail view
2. Click the **Iterate** button
3. Enter a prompt to modify (e.g., "Change to a pie chart with warmer colors")
4. The AI preserves the parent's data and applies your changes
5. Iterations link back to the parent post

### Downloading
- Click the **download** icon on any post
- Generates a PNG with branded footer
- Works on both feed cards and detail view

### Interacting
- **Heart**: Like a post
- **Comment**: Share your thoughts
- **Share**: Copy link or share via platform sharing
- **Bookmark**: Save for later
- **Iterate**: Fork and remix the infographic

---

## Admin Panel

Access at `/admin` (admin role required).

### Collections
- **Users**: Manage accounts, change roles
- **Posts**: View/edit/delete all infographics, inspect DNA
- **Media**: Uploaded images and rendered screenshots

### AI Agent Config
Global settings for the AI generation engine:
- **System Prompt**: Core instructions for the AI
- **Engagement Prompt**: Persona and style guide for generated content
- **Temperature**: Controls creativity (0.0 = deterministic, 1.0 = creative)
- **Max Tokens**: Maximum response length

---

## Architecture at a Glance

Every infographic is a **DNA JSON object** with two layers:

```
DNA = {
  content: {          // WHAT (facts, data, sources)
    title, subtitle, hook, data[], sources[], footnotes
  },
  presentation: {     // HOW (styling, chart type, colors)
    theme, chartType, layout, colors
  }
}
```

- Content and presentation are always separate
- Sources are populated by AI via web search (mandatory)
- DNA is stored as `jsonb` in PostgreSQL
- A rendered image (WebP) is cached for feed performance
- Iteration = new post with `parentPost` pointing to original

---

## Production

| Detail | Value |
|--------|-------|
| Live URL | `http://infographedia.167.86.81.161.sslip.io` |
| Admin Panel | `http://infographedia.167.86.81.161.sslip.io/admin` |
| PM2 Process | `infographedia` |

### Deploying Updates

```bash
# From local machine
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='.env' \
  -e "ssh -o StrictHostKeyChecking=no" \
  /Users/mbkesara/Projects/infographedia/ \
  root@167.86.81.161:/home/admin/web/infographedia.167.86.81.161.nip.io/nodeapp/

# On server
cd /home/admin/web/infographedia.167.86.81.161.nip.io/nodeapp
pnpm install --frozen-lockfile && pnpm build && pm2 restart infographedia
```

### Useful Commands

```bash
pm2 logs infographedia --lines 50    # View logs
pm2 restart infographedia            # Restart
npx payload migrate                  # Apply DB migrations
```
