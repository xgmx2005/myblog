import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

import { profile, skills } from '../src/data/profile'
import { integ, theme } from '../src/site.config'

const root = resolve(import.meta.dir, '..')

describe('CC profile', () => {
  test('contains only the confirmed public identity', () => {
    expect(profile).toEqual({
      id: 'CC',
      location: '杭州 · 余杭区',
      quote: '生命的意义本不在向外的寻取，而在向内的建立',
      summary:
        '杭州师范大学计算机科学与技术专业在读，同时持续关注 AI、开源工具、互联网资源与公益站。',
      education: {
        school: '杭州师范大学',
        major: '计算机科学与技术',
        period: '2023 至今'
      },
      github: 'https://github.com/xgmx2005/',
      email: {
        encoded: 'MjQ2MzMyMzQ0N0BxcS5jb20=',
        masked: '2463••••••@qq.com'
      }
    })
    expect(profile.summary).not.toMatch(/考公|公务员|公考/)
  })

  test('contains the confirmed skill groups without levels', () => {
    expect(skills).toEqual({
      Languages: ['Python', 'C', 'C++', 'Java', 'HTML', 'JavaScript', 'CSS', 'SQL'],
      Frontend: ['React', 'Vue'],
      Backend: ['Flask', 'Nginx', 'Next.js'],
      Others: ['公益站']
    })
  })

  test('ships the selected avatar', () => {
    const avatar = resolve(root, 'src/assets/avatar.jpg')
    expect(existsSync(avatar)).toBe(true)
    expect(statSync(avatar).size).toBeGreaterThan(10_000)
  })
})

describe('site configuration', () => {
  test('uses Chinese navigation and CC metadata', () => {
    expect(theme.title).toBe('CC')
    expect(theme.author).toBe('CC')
    expect(theme.logo.alt).toBe('CC avatar')
    expect(theme.header.menu).toEqual([
      { title: '首页', link: '/' },
      { title: '文章', link: '/blog' },
      { title: '项目', link: '/projects' },
      { title: '友链', link: '/links' },
      { title: '留言板', link: '/guestbook' },
      { title: '关于', link: '/about' }
    ])
  })

  test('keeps the local quote source and no upstream service identity', () => {
    expect(integ.quote.server).toBe('/quote.json')
    expect(integ.waline.enable).toBe(false)
    const configSource = readFileSync(resolve(root, 'src/site.config.ts'), 'utf8')
    expect(configSource).not.toContain('dummyjson.com')
    expect(configSource).not.toContain('astro-theme-pure-waline')
    expect(configSource).not.toContain('cworld1')
  })

  test('uses SITE_URL with a localhost fallback', () => {
    const astroConfig = readFileSync(resolve(root, 'astro.config.ts'), 'utf8')
    expect(astroConfig).toContain("process.env.SITE_URL ?? 'http://localhost:4321'")
    expect(astroConfig).not.toContain('astro-pure.js.org')
  })
})
