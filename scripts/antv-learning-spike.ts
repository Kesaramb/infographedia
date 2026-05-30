import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import sharp from 'sharp'
import { renderToString } from '@antv/infographic/ssr'

interface SpikeExample {
  slug: string
  syntax: string
  width: number
  height: number
  insight: string
}

const examples: SpikeExample[] = [
  {
    slug: 'ranked-hubs',
    width: 900,
    height: 1400,
    insight: 'AntV feels strongest when the structure itself carries the editorial hierarchy, not when we force everything through one generic chart shell.',
    syntax: [
      'infographic list-grid-badge-card',
      'theme',
      '  colorPrimary #2F54EB',
      '  colorBg #0F1224',
      '  palette',
      '    - #2F54EB',
      '    - #13C2C2',
      '    - #FA8C16',
      'data',
      '  title 5 Startup Hubs Absorb Most Global VC Attention',
      '  desc A handful of cities still dominate venture narratives, funding, and talent gravity.',
      '  lists',
      '    - label Silicon Valley',
      '      desc 120B • U.S. capital magnet',
      '    - label London',
      '      desc 45B • Europe\\’s cross-border gateway',
      '    - label Beijing',
      '      desc 38B • State-backed scale advantage',
      '    - label Bangalore',
      '      desc 26B • India\\’s engineering density',
      '    - label Tel Aviv',
      '      desc 21B • Security and deep-tech edge',
    ].join('\n'),
  },
  {
    slug: 'missions-to-mars',
    width: 900,
    height: 1400,
    insight: 'AntV timelines can feel much more infographic-native than our current list-like sequencing because the nodes themselves can carry story steps.',
    syntax: [
      'infographic sequence-timeline-rounded-rect-node',
      'theme',
      '  colorPrimary #F97316',
      '  colorBg #120E16',
      '  palette',
      '    - #F97316',
      '    - #60A5FA',
      '    - #A855F7',
      'data',
      '  title Missions to Mars Are Failing Less Often',
      '  desc The Red Planet still defeats many missions, but the odds are no longer as bleak as they once were.',
      '  sequences',
      '    -',
      '      time 1960s',
      '      label Early attempts mostly failed',
      '      desc Limited guidance and communication made deep-space missions brutally fragile.',
      '    -',
      '      time 1971',
      '      label Mars 3 reached the surface briefly',
      '      desc A Soviet craft became the first to soft-land, even though contact vanished within seconds.',
      '    -',
      '      time 1997',
      '      label Pathfinder changed confidence',
      '      desc NASA proved a lower-cost robotic mission could land and operate successfully.',
      '    -',
      '      time 2012',
      '      label Curiosity reset expectations',
      '      desc A complex sky-crane landing showed large payloads could arrive safely.',
      '    -',
      '      time 2021',
      '      label Perseverance and Ingenuity widened the mission playbook',
      '      desc Mars missions became not just survivable, but experimentally ambitious.',
    ].join('\n'),
  },
  {
    slug: 'ai-video-share',
    width: 900,
    height: 1300,
    insight: 'AntV compare templates are much better at conflict, tension, and thesis-vs-antithesis framing than our current summary cards.',
    syntax: [
      'infographic compare-binary-horizontal-badge-card-vs',
      'theme',
      '  colorPrimary #E11D48',
      '  colorBg #111827',
      '  palette',
      '    - #E11D48',
      '    - #2563EB',
      '    - #F59E0B',
      'data',
      '  title AI Video Traffic Has Split Into Two Camps',
      '  desc One group wins on image-native virality while another keeps stronger multi-tool platform gravity.',
      '  compares',
      '    - label Image-first challengers',
      '      children',
      '        - label Grok Imagine',
      '          desc Fast social-native growth',
      '        - label Kling',
      '          desc Strong burst adoption',
      '    - label Platform-integrated incumbents',
      '      children',
      '        - label Sora',
      '          desc Distribution through ecosystem familiarity',
      '        - label Runway',
      '          desc Creative workflow stickiness',
    ].join('\n'),
  },
]

async function main() {
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'infographedia-antv-learning-'))

  for (const example of examples) {
    const svg = await renderToString(example.syntax, {
      width: example.width,
      height: example.height,
      padding: 24,
    })

    const svgPath = path.join(outputDir, `${example.slug}.svg`)
    const pngPath = path.join(outputDir, `${example.slug}.png`)

    await fs.writeFile(svgPath, svg)
    await sharp(Buffer.from(svg)).png().toFile(pngPath)

    console.log(`${example.slug}:`)
    console.log(`  svg: ${svgPath}`)
    console.log(`  png: ${pngPath}`)
    console.log(`  insight: ${example.insight}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
