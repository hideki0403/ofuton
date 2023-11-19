# ofuton
[English](README.md) | 日本語  
  
Misskey専用の軽量なオブジェクトストレージ  

## 機能
「ofuton」は以下のs3互換APIを実装しています。
- PutObject
- DeleteObject
- CreateMultiPartUpload
- UploadPart
- CompleteMultipartUpload
- AbortMultipartUpload

MisskeyではこれらのAPIしか使用しないため、「ofuton」をMisskey用のオブジェクトストレージとして使用することができます。  
(Misskey以外での動作は保証していません)

## セットアップ
> **Note**  
> 「ofuton」を使用するには以下のソフトウェアがインストールされ、設定されている必要があります。  
>  - Node.js (v18.0.0以上)
>  - pnpm

### 1. このリポジトリをクローン
```bash
git clone https://github.com/hideki0403/ofuton.git
```

### 2. 依存関係をインストール
```bash
cd ofuton
pnpm install
```

### 3. ビルド
```bash
pnpm build
```

### 4. 設定
```bash
cp config.example.yml config.yml
```

### 5. 起動
```bash
pnpm start

# pm2をインストールしている場合は、以下のコマンドから直接pm2に登録および起動することができます。
# pm2 start pm2.json
```

### 6. Misskey側での設定
サーバーの「コントロールパネル」を開き、「オブジェクトストレージ」ページに移動します。  
移動後、以下の内容で設定します。 (山カッコの中の値は適時変更してください)

| Name | Value | Example |
| ---- | ----- | ------- |
| BaseURL | `https://<domain>/<bucket>` | `https://media.example.com/static` |
| Bucket | `<bucket>` | `static` |
| Prefix | `<prefix>` | `misskey` |
| Endpoint | `<IP>:<port>` | `192.168.0.1:3000` |
| Region | `auto` |
| AccessKey | `<accessKey>` | `hogehoge` |
| SecretKey | `<secretKey>` | `fugafuga` |
| SSLを使用する | オフ |
| Proxyを利用する | オフ |
| アップロード時に'publc-read'を設定する | オフ |
| s3ForcePathStyle | オン |
  
- bucket名は任意です
- 「Endpoint」のIPは「ofuton」がセットアップされているサーバーのIPを指定してください
- `port` `accessKey` `secretKey` はconfig.ymlから設定できます