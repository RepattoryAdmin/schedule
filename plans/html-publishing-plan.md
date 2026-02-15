# HTML公開機能 実装計画

## 📋 概要

現在、「公開する」ボタンを押してもHTMLが実際に保存・公開されていない問題を解決します。
URL形式を `lesson-YYYY-MM-DD` にして、Cloud Storageに実際にHTMLを保存し、公開アクセス可能にします。

## 🎯 目標

- ✅ URL形式: `https://storage.googleapis.com/cooking-class-system.appspot.com/lessons/lesson-2025-02-02.html`
- ✅ 実際にCloud StorageにHTMLファイルを保存
- ✅ 公開URLで誰でもアクセス可能
- ✅ レッスン日付をファイル名に使用

## 🏗️ アーキテクチャ

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐      ┌────────────────┐
│  ユーザー    │─────▶│  フロントエンド   │─────▶│  API Route      │─────▶│ Cloud Function │
│  (ブラウザ)  │      │  (Next.js)       │      │  /api/publish   │      │  publishLesson │
└─────────────┘      └──────────────────┘      └─────────────────┘      └────────┬───────┘
                                                                                   │
                                                                                   ▼
                                                                          ┌─────────────────┐
                                                                          │ Cloud Storage   │
                                                                          │ lessons/*.html  │
                                                                          └─────────────────┘
```

## 📁 ファイル構造

```
/
├── functions/
│   └── src/
│       └── index.ts           # publishLesson 関数を追加
├── frontend/
│   └── app/
│       ├── page.tsx           # handlePublish を修正
│       └── api/
│           └── publish/
│               └── route.ts   # 新規作成
└── Cloud Storage バケット
    └── lessons/
        ├── lesson-2025-02-02.html
        ├── lesson-2025-02-15.html
        └── ...
```

## 🔧 実装詳細

### 1. Cloud Function: `publishLesson` の追加

**ファイル**: `functions/src/index.ts`

```typescript
import {getStorage} from "firebase-admin/storage";
import * as admin from "firebase-admin";

// 初期化（ファイル冒頭に追加）
if (!admin.apps.length) {
  admin.initializeApp();
}

// 新しい関数
export const publishLesson = onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }

  try {
    const {html, date} = req.body;
    
    // 日付からファイル名を生成 (例: 2025-02-02 → lesson-2025-02-02.html)
    const fileName = `lesson-${date}.html`;
    const filePath = `lessons/${fileName}`;
    
    // Cloud Storage にアップロード
    const bucket = getStorage().bucket();
    const file = bucket.file(filePath);
    
    await file.save(html, {
      contentType: "text/html; charset=utf-8",
      metadata: {
        cacheControl: "public, max-age=3600",
      },
    });
    
    // ファイルを公開設定
    await file.makePublic();
    
    // 公開URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    
    res.json({
      success: true,
      url: publicUrl,
      fileName: fileName,
    });
  } catch (error) {
    console.error("Publish error:", error);
    res.status(500).json({
      error: "公開に失敗しました",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});
```

**主な処理**:
1. リクエストから`html`と`date`を取得
2. ファイル名を`lesson-YYYY-MM-DD.html`形式で生成
3. Cloud Storageの`lessons/`フォルダに保存
4. ファイルを公開設定（誰でもアクセス可能）
5. 公開URLを返却

### 2. Next.js API Route: `/api/publish` の作成

**ファイル**: `frontend/app/api/publish/route.ts` (新規作成)

```typescript
import { NextRequest, NextResponse } from "next/server"

const PUBLISH_API_URL =
  process.env.NEXT_PUBLIC_PUBLISH_URL ||
  "https://asia-northeast1-cooking-class-system.cloudfunctions.net/publishLesson"

export async function POST(request: NextRequest) {
  try {
    const { html, date } = await request.json()

    if (!html || !date) {
      return NextResponse.json(
        { error: "HTMLと日付が必要です" },
        { status: 400 }
      )
    }

    // Cloud Functions の publishLesson を呼び出し
    const response = await fetch(PUBLISH_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ html, date }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `公開エラー: ${response.status}`)
    }

    const result = await response.json()
    return NextResponse.json(result)
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
```

### 3. フロントエンド: `handlePublish` の修正

**ファイル**: `frontend/app/page.tsx`

#### 変更点1: formDataを保持するstateを追加

```typescript
// 現在のformDataを保持（公開時に日付を使用するため）
const [currentFormData, setCurrentFormData] = useState<LessonFormData | null>(null)
```

#### 変更点2: `handleGenerate`でformDataを保存

```typescript
const handleGenerate = async (data: LessonFormData) => {
  setIsGenerating(true)
  setError(null)
  setCurrentFormData(data) // ← 追加: formDataを保存
  
  // ... 既存のコード
}
```

#### 変更点3: `handlePublish`を実装

```typescript
const handlePublish = async () => {
  if (!generatedContent?.htmlContent || !currentFormData?.date) {
    toast({
      title: "エラー",
      description: "公開するコンテンツまたは日付が見つかりません",
      variant: "destructive",
    })
    return
  }

  setIsPublishing(true)
  try {
    const response = await fetch("/api/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        html: generatedContent.htmlContent,
        date: currentFormData.date, // YYYY-MM-DD 形式
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || "公開に失敗しました")
    }

    const result = await response.json()
    setPublishedUrl(result.url)

    toast({
      title: "公開完了",
      description: `LPを公開しました: ${result.fileName}`,
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "公開に失敗しました"
    toast({
      title: "エラー",
      description: errorMessage,
      variant: "destructive",
    })
  } finally {
    setIsPublishing(false)
  }
}
```

## 🔐 セキュリティとアクセス制御

### Cloud Storage バケット設定

1. **バケット名**: `cooking-class-system.appspot.com` (Firebase自動作成)
2. **フォルダ**: `/lessons/`
3. **アクセス権限**: 
   - 読み取り: 公開（誰でもURLでアクセス可能）
   - 書き込み: Cloud Function のみ

### CORS設定（必要に応じて）

```json
[
  {
    "origin": ["*"],
    "method": ["GET"],
    "maxAgeSeconds": 3600
  }
]
```

## 📊 データフロー例

### 入力データ
```json
{
  "menu": "りんご",
  "date": "2026-02-26",
  "time": "10:00",
  "duration": 120,
  "price": 2090,
  "instructor": "澤井りえ"
}
```

### 生成後
```
生成されたHTML + 日付 (2026-02-26)
  ↓
POST /api/publish
  ↓
POST Cloud Functions/publishLesson
  ↓
Cloud Storage: lessons/lesson-2026-02-26.html
  ↓
公開URL: https://storage.googleapis.com/cooking-class-system.appspot.com/lessons/lesson-2026-02-26.html
```

## ✅ 実装チェックリスト

- [ ] **functions/src/index.ts** に `publishLesson` 関数を追加
  - [ ] firebase-admin の初期化
  - [ ] Cloud Storage への保存処理
  - [ ] ファイル公開設定
  - [ ] エラーハンドリング

- [ ] **frontend/app/api/publish/route.ts** を新規作成
  - [ ] Cloud Functions への呼び出し
  - [ ] バリデーション
  - [ ] エラーハンドリング

- [ ] **frontend/app/page.tsx** を修正
  - [ ] `currentFormData` state を追加
  - [ ] `handleGenerate` で formData を保存
  - [ ] `handlePublish` を実装

- [ ] デプロイとテスト
  - [ ] Cloud Functions をデプロイ
  - [ ] フロントエンドをテスト
  - [ ] 公開URLでアクセス確認

## 🚀 デプロイ手順

1. Cloud Functions をデプロイ:
```bash
cd functions
npm run build
firebase deploy --only functions
```

2. フロントエンドの変更を確認:
```bash
cd frontend
pnpm dev
```

3. 動作確認:
   - レッスン情報を入力
   - 「生成する」をクリック
   - 「公開する」をクリック
   - 公開URLにアクセスして確認

## 🐛 トラブルシューティング

### エラー: "Permission denied"
→ Cloud Functionsにストレージへのアクセス権限がない
→ Firebase Admin SDK が正しく初期化されているか確認

### エラー: "File already exists"
→ 同じ日付で複数回公開すると上書きされる（正常動作）
→ 必要であればタイムスタンプを追加可能

### 公開URLにアクセスできない
→ `file.makePublic()` が実行されているか確認
→ Cloud Storageの権限設定を確認

## 📝 注意事項

1. **ファイルの上書き**: 同じ日付で複数回公開すると、古いファイルが上書きされます
2. **キャッシュ**: `Cache-Control: public, max-age=3600` で1時間キャッシュされます
3. **コスト**: Cloud Storageの保存とネットワーク転送に費用がかかりますが、少量なら無料枠内です

## 🎉 完成後の動作

1. ユーザーがレッスン情報を入力（日付: 2026-02-26）
2. 「生成する」をクリック → HTML/LINE/メールが生成される
3. 「公開する」をクリック → Cloud Storageに保存される
4. 公開URL `https://storage.googleapis.com/cooking-class-system.appspot.com/lessons/lesson-2026-02-26.html` が表示される
5. URLをクリック → 美しいLPが表示される✨
