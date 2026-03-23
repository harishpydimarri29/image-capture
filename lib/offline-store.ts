const DB_NAME = 'job-capture-offline'
const DB_VERSION = 1
const STORE_NAME = 'pending-uploads'

export interface PendingUpload {
  id: string
  frontImageData: ArrayBuffer
  frontImageName: string
  frontImageType: string
  backImageData: ArrayBuffer | null
  backImageName: string | null
  backImageType: string | null
  metadata: {
    phoneNumber: string
    date: string
    route: string
    totalAmount: string
    profit: string
    tags: string[]
  }
  createdAt: number
  retryCount: number
  status: 'pending' | 'uploading' | 'failed'
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function tx(
  db: IDBDatabase,
  mode: IDBTransactionMode
): { store: IDBObjectStore; done: Promise<void> } {
  const transaction = db.transaction(STORE_NAME, mode)
  const store = transaction.objectStore(STORE_NAME)
  const done = new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  return { store, done }
}

async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer()
}

export async function savePendingUpload(
  frontImage: File,
  backImage: File | null,
  metadata: PendingUpload['metadata']
): Promise<string> {
  const db = await openDB()
  const id = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const frontImageData = await fileToArrayBuffer(frontImage)
  let backImageData: ArrayBuffer | null = null
  if (backImage) {
    backImageData = await fileToArrayBuffer(backImage)
  }

  const record: PendingUpload = {
    id,
    frontImageData,
    frontImageName: frontImage.name,
    frontImageType: frontImage.type,
    backImageData,
    backImageName: backImage?.name ?? null,
    backImageType: backImage?.type ?? null,
    metadata,
    createdAt: Date.now(),
    retryCount: 0,
    status: 'pending',
  }

  const { store, done } = tx(db, 'readwrite')
  store.put(record)
  await done
  db.close()
  return id
}

export async function getPendingUploads(): Promise<PendingUpload[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const { store } = tx(db, 'readonly')
    const request = store.index('createdAt').getAll()
    request.onsuccess = () => {
      db.close()
      resolve(request.result as PendingUpload[])
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

export async function getPendingCount(): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const { store } = tx(db, 'readonly')
    const request = store.count()
    request.onsuccess = () => {
      db.close()
      resolve(request.result)
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

export async function updateUploadStatus(
  id: string,
  status: PendingUpload['status'],
  incrementRetry = false
): Promise<void> {
  const db = await openDB()
  const { store, done } = tx(db, 'readwrite')

  const getReq = store.get(id)
  getReq.onsuccess = () => {
    const record = getReq.result as PendingUpload | undefined
    if (record) {
      record.status = status
      if (incrementRetry) record.retryCount += 1
      store.put(record)
    }
  }

  await done
  db.close()
}

export async function deletePendingUpload(id: string): Promise<void> {
  const db = await openDB()
  const { store, done } = tx(db, 'readwrite')
  store.delete(id)
  await done
  db.close()
}

export async function clearAllPending(): Promise<void> {
  const db = await openDB()
  const { store, done } = tx(db, 'readwrite')
  store.clear()
  await done
  db.close()
}
