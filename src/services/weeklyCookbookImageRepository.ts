const DATABASE_NAME = 'nutriplan-weekly-cookbooks-local'
const DATABASE_VERSION = 1
const STORE_NAME = 'images'

interface StoredImage {
  id: string
  planId: string
  fileName: string
  blob: Blob
  updatedAt: string
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('planId', 'planId', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function waitForTransaction(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

export async function saveLocalCookbookImages(planId: string, weekStart: string, files: File[]) {
  if (!files.length) return
  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAME, 'readwrite')
  const store = transaction.objectStore(STORE_NAME)
  const now = new Date().toISOString()
  const editionId = `${planId}::${weekStart}`
  files.forEach((file) => {
    const image: StoredImage = { id: `${editionId}::${file.name}`, planId: editionId, fileName: file.name, blob: file, updatedAt: now }
    store.put(image)
  })
  await waitForTransaction(transaction)
  database.close()
}

export async function getLocalCookbookImageUrls(planId: string, weekStart: string): Promise<Record<string, string>> {
  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAME, 'readonly')
  const request = transaction.objectStore(STORE_NAME).index('planId').getAll(`${planId}::${weekStart}`)
  const images = await new Promise<StoredImage[]>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as StoredImage[])
    request.onerror = () => reject(request.error)
  })
  await waitForTransaction(transaction)
  database.close()
  return Object.fromEntries(images.map((image) => [image.fileName, URL.createObjectURL(image.blob)]))
}

export function revokeLocalCookbookImageUrls(urls: Record<string, string>) {
  Object.values(urls).forEach((url) => URL.revokeObjectURL(url))
}
