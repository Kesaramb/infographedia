import { getPayload } from 'payload'
import config from '../payload.config'
import { SEED_DNA } from '../src/lib/dna/seed-data'
import { DNASchema } from '../src/lib/dna/schema'

async function seed() {
  console.log('🌱 Starting seed...')

  const payload = await getPayload({ config })

  // --- Clear existing data ---
  console.log('🧹 Clearing existing posts...')
  const existingPosts = await payload.find({ collection: 'posts', limit: 100 })
  for (const post of existingPosts.docs) {
    await payload.delete({ collection: 'posts', id: post.id })
  }

  // --- Create seed users ---
  console.log('👤 Creating seed users...')

  const users = [
    { username: 'data.pioneer', email: 'pioneer@infographedia.dev', password: 'password123', role: 'user' as const },
    { username: 'eco_metrics', email: 'eco@infographedia.dev', password: 'password123', role: 'user' as const },
    { username: 'neuro_mapper', email: 'neuro@infographedia.dev', password: 'password123', role: 'user' as const },
    { username: 'cyber.analyst', email: 'cyber@infographedia.dev', password: 'password123', role: 'user' as const },
  ]

  const createdUsers: Array<{ id: number | string; username: string }> = []

  for (const userData of users) {
    // Check if user exists
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: userData.email } },
    })

    if (existing.docs.length > 0) {
      createdUsers.push({
        id: existing.docs[0].id,
        username: userData.username,
      })
      console.log(`  ✓ User ${userData.username} already exists`)
    } else {
      const user = await payload.create({
        collection: 'users',
        data: userData,
      })
      createdUsers.push({ id: user.id, username: userData.username })
      console.log(`  ✓ Created user ${userData.username}`)
    }
  }

  // --- Validate and create posts ---
  console.log('📊 Creating seed posts...')

  const createdPosts: Array<{ id: number | string; title: string }> = []

  for (let i = 0; i < SEED_DNA.length; i++) {
    const seedItem = SEED_DNA[i]

    // Validate DNA with Zod
    const validation = DNASchema.safeParse(seedItem.dna)
    if (!validation.success) {
      console.error(`  ✗ DNA validation failed for "${seedItem.title}":`)
      console.error(`    ${JSON.stringify(validation.error)}`)
      continue
    }

    // Assign author (rotate through users)
    const author = createdUsers[i % createdUsers.length]

    // Post #8 (index 7) is an iteration of post #1 (index 0)
    const isIteration = i === 7 && createdPosts.length > 0
    const parentPost = isIteration ? createdPosts[0].id : undefined

    const post = await payload.create({
      collection: 'posts',
      data: {
        author: author.id as number,
        title: seedItem.title,
        description: seedItem.description,
        dna: validation.data,
        tags: seedItem.tags.map((tag) => ({ tag })),
        parentPost: parentPost as number | undefined,
        metrics: {
          likes: Math.floor(Math.random() * 5000) + 100,
          saves: Math.floor(Math.random() * 500) + 10,
          shares: Math.floor(Math.random() * 200) + 5,
          iterationCount: isIteration ? 0 : Math.floor(Math.random() * 20),
        },
      },
    })

    createdPosts.push({ id: post.id, title: seedItem.title })
    console.log(
      `  ✓ Created post "${seedItem.title}"${isIteration ? ' (iteration of #1)' : ''}`
    )
  }

  console.log('')
  console.log(`✅ Seed complete: ${createdUsers.length} users, ${createdPosts.length} posts`)
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
