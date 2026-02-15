import { NextRequest, NextResponse } from "next/server"
import { Storage } from "@google-cloud/storage"

// Cloud Storage初期化
const storage = new Storage({
  projectId: process.env.GCLOUD_PROJECT || "cooking-class-system",
})

const BUCKET_NAME = "cooking-class-system.appspot.com"

export async function POST(request: NextRequest) {
  try {
    const { html, date } = await request.json()

    // バリデーション
    if (!html || !date) {
      return NextResponse.json(
        { error: "HTMLと日付が必要です" },
        { status: 400 }
      )
    }

    // 日付フォーマットの検証（YYYY-MM-DD）
    const datePattern = /^\d{4}-\d{2}-\d{2}$/
    if (!datePattern.test(date)) {
      return NextResponse.json(
        { error: "日付は YYYY-MM-DD 形式で指定してください" },
        { status: 400 }
      )
    }

    // ファイル名生成（例: lesson-2025-02-02.html）
    const fileName = `lesson-${date}.html`
    const filePath = `lessons/${fileName}`

    // Cloud Storage バケット取得
    const bucket = storage.bucket(BUCKET_NAME)
    const file = bucket.file(filePath)

    // HTMLをアップロード
    await file.save(html, {
      contentType: "text/html; charset=utf-8",
      metadata: {
        cacheControl: "public, max-age=3600",
        contentDisposition: "inline",
      },
    })

    // ファイルを公開設定
    await file.makePublic()

    // 公開URL
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filePath}`

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: fileName,
      filePath: filePath,
    })
  } catch (error) {
    console.error("Publish API error:", error)
    return NextResponse.json(
      {
        error: "公開に失敗しました",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
