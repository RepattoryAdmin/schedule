import { NextRequest, NextResponse } from "next/server"
import { Storage } from "@google-cloud/storage"

// Cloud Storage初期化
const storage = new Storage({
  projectId: process.env.GCLOUD_PROJECT || "cooking-class-system",
})

const BUCKET_NAME = "cooking-class-lessons"

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

    // HTMLをアップロード（公開URLとして使用）
    await file.save(html, {
      contentType: "text/html; charset=utf-8",
      metadata: {
        cacheControl: "public, max-age=3600",
        contentDisposition: "inline",
      },
      // Uniform bucket-level accessが有効なため、ファイルレベルの公開設定は不要
      predefinedAcl: 'publicRead',
    })

    // 公開URL
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filePath}`

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: fileName,
      filePath: filePath,
    })
  } catch (error) {
    // 詳細なエラーログを出力
    console.error("Publish API error:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      code: (error as any)?.code,
      errors: (error as any)?.errors,
      type: error instanceof Error ? error.constructor.name : typeof error,
    })

    // エラーの種類に応じたメッセージ
    let errorMessage = "公開に失敗しました"
    const errorCode = (error as any)?.code

    if (errorCode === 401 || errorCode === 403) {
      errorMessage = "認証エラー: ストレージへのアクセス権限がありません"
    } else if (errorCode === 404) {
      errorMessage = "バケットが見つかりません"
    } else if (error instanceof Error && error.message.includes("bucket")) {
      errorMessage = "ストレージバケットへのアクセスに失敗しました"
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
