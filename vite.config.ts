import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import fs from 'node:fs'

const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

// Local dev scanner API middleware for browser testing
function scannerDevPlugin() {
  return {
    name: 'scanner-dev-api',
    configureServer(server: any) {
      server.middlewares.use('/api/scanner/acquire', (req: any, res: any, next: any) => {
        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: any) => (body += chunk))
          req.on('end', async () => {
            try {
              if (process.platform === 'win32') {
                const { execFile } = await import('node:child_process')
                const path = await import('node:path')
                const os = await import('node:os')
                const fsp = await import('node:fs')
                const tempDir = os.tmpdir()
                const tempBmp = path.join(tempDir, `vite_scan_${Date.now()}.bmp`)
                const scriptPath = path.join(tempDir, `vite_ps_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.ps1`)
                const ps = `
                try {
                  $cd = New-Object -ComObject WIA.CommonDialog -ErrorAction SilentlyContinue
                  if ($cd) {
                    $img = $cd.ShowAcquireImage(1, 1, 131072, "{B96B3CAB-0728-11D3-9D7B-0000F81EF32E}", $false, $true, $false)
                    if ($img) { $img.SaveFile('${tempBmp.replace(/\\/g, '\\\\')}'); Write-Output 'SUCCESS' }
                  }
                } catch {}
                `
                fsp.writeFileSync(scriptPath, '\ufeff' + ps, 'utf8')
                execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath], { timeout: 30000 }, (_err, stdout) => {
                  try { if (fsp.existsSync(scriptPath)) fsp.unlinkSync(scriptPath) } catch {}
                  if (stdout && stdout.includes('SUCCESS') && fsp.existsSync(tempBmp)) {
                    const buf = fsp.readFileSync(tempBmp)
                    try { fsp.unlinkSync(tempBmp) } catch {}
                    res.setHeader('Content-Type', 'application/json')
                    res.end(JSON.stringify({
                      success: true,
                      dataUrl: `data:image/bmp;base64,${buf.toString('base64')}`,
                      filename: `scan_${Date.now()}.bmp`,
                    }))
                    return
                  }
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ success: false }))
                })
                return
              }
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false }))
            } catch {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false }))
            }
          })
        } else {
          next()
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), scannerDevPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})

