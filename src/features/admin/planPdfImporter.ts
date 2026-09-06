import pdfjs from '../../lib/pdf'
import type { Alimento } from '../../services/alimentosService'
import JSZip from 'jszip'

export type ImportedIngredient = { food: Alimento; grams: number; household: string }
export type ImportedMeal = { day: string; type: string; name: string; servings: number; ingredients: ImportedIngredient[]; preparation: string; tip: string; conservation: string }
export type PdfImportResult = { meals: ImportedMeal[]; unmatched: string[] }

const clean = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const field = (block: string, label: string) => block.match(new RegExp(`(?:^|\\n)${label}:\\s*([^\\n]*)`, 'i'))?.[1]?.trim() || ''

function findFood(name: string, foods: Alimento[]) {
  const needle = clean(name)
  return foods.find(food => clean(food.nombre) === needle)
    || foods.find(food => clean(food.nombre).includes(needle) || needle.includes(clean(food.nombre)))
}

export async function extractPdfText(file: File) {
  const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const pages: string[] = []
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const content = await (await document.getPage(pageNumber)).getTextContent()
    pages.push(content.items.map(item => 'str' in item ? item.str : '').join('\n'))
  }
  return pages.join('\n')
}

export async function extractDocxText(file: File) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const xml = await zip.file('word/document.xml')?.async('text')
  if (!xml) throw new Error('DOCX_INVALIDO')
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  return [...document.getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'p')]
    .map(paragraph => [...paragraph.getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 't')].map(node => node.textContent || '').join(''))
    .join('\n')
}

export function parsePlanText(text: string, foods: Alimento[]): PdfImportResult {
  const normalized = text.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n')
  const blocks = normalized.split(/(?=D[IÍ]A:\s*)/i).filter(block => /D[IÍ]A:/i.test(block))
  const unmatched = new Set<string>()
  const meals = blocks.map(block => {
    const ingredientsSection = block.match(/INGREDIENTES:\s*([\s\S]*?)(?=\nPREPARACI[ÓO]N:|$)/i)?.[1] || ''
    const ingredients = ingredientsSection.split('\n').map(line => line.replace(/^\s*[-•]\s*/, '').trim()).filter(Boolean).flatMap(line => {
      const parts = line.split('|').map(part => part.trim())
      const amount = parts[0]?.match(/([\d.,]+)\s*g/i)
      if (!amount || !parts[1]) return []
      const food = findFood(parts[1], foods)
      if (!food) { unmatched.add(parts[1]); return [] }
      return [{ food, grams: Number(amount[1].replace(',', '.')), household: parts[2] || '' }]
    })
    const preparation = block.match(/PREPARACI[ÓO]N:\s*([\s\S]*?)(?=\nCONSEJO:|\nCONSERVACI[ÓO]N:|$)/i)?.[1]?.trim() || ''
    return { day: field(block, 'D[IÍ]A'), type: field(block, 'COMIDA'), name: field(block, 'NOMBRE'), servings: Math.max(1, Number(field(block, 'PORCIONES')) || 1), ingredients, preparation, tip: field(block, 'CONSEJO'), conservation: field(block, 'CONSERVACI[ÓO]N') }
  }).filter(meal => meal.day && meal.name)
  return { meals, unmatched: [...unmatched] }
}
