/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import type { ServerFunctionClient } from 'payload'

import config from '@payload-config'
import { RootLayout } from '@payloadcms/next/layouts'
import React from 'react'

import { importMap } from './importMap.js'
import '@payloadcms/next/css'

type Args = {
  children: React.ReactNode
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serverFunction: ServerFunctionClient = async function (args: any) {
  'use server'
  // Dynamic import to handle different Payload versions
  const mod = await import('@payloadcms/next/utilities') as any
  const fn = mod.default ?? mod.handleServerFunctions
  if (fn) return fn({ ...args, config, importMap })
  return null
}

const Layout = ({ children }: Args) =>
  RootLayout({ children, config, importMap, serverFunction })

export default Layout
