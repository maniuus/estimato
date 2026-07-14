import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin, bytecodePlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator'

export default defineConfig(({ command }) => {
  const isBuild = command === 'build'

  return {
    main: {
      plugins: [
        externalizeDepsPlugin(),
        isBuild ? bytecodePlugin() : null
      ].filter(Boolean),
      build: {
        outDir: 'out/main',
        rollupOptions: {
          input: {
            index: resolve(__dirname, 'electron/main/index.ts')
          }
        }
      }
    },
    preload: {
      plugins: [
        externalizeDepsPlugin(),
        isBuild ? bytecodePlugin() : null
      ].filter(Boolean),
      build: {
        outDir: 'out/preload',
        rollupOptions: {
          input: {
            index: resolve(__dirname, 'electron/preload/index.ts')
          }
        }
      }
    },
    renderer: {
      root: '.',
      build: {
        outDir: 'out/renderer',
        rollupOptions: {
          input: {
            index: resolve(__dirname, 'index.html')
          }
        }
      },
      plugins: [
        react(),
        isBuild
          ? obfuscatorPlugin({
              options: {
                compact: true,
                controlFlowFlattening: false,
                deadCodeInjection: false,
                debugProtection: false,
                disableConsoleOutput: false,
                identifierNamesGenerator: 'hexadecimal',
                log: false,
                numbersToExpressions: false,
                renameGlobals: false,
                selfDefending: false,
                simplify: true,
                splitStrings: true,
                stringArray: true,
                stringArrayCallsTransform: false,
                stringArrayEncoding: [],
                stringArrayIndexShift: true,
                stringArrayRotate: true,
                stringArrayShuffle: true,
                stringArrayWrappersCount: 1,
                stringArrayWrappersChaining: true,
                stringArrayWrappersParametersMaxCount: 2,
                stringArrayWrappersType: 'variable',
                stringArrayThreshold: 0.75,
                unicodeEscapeSequence: false
              }
            })
          : null
      ].filter(Boolean),
      resolve: {
        alias: {
          '@': resolve(__dirname, 'src')
        }
      }
    }
  }
})
