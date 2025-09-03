# 📘 Image Optimization Guide

This guide documents how to optimize images for web use before adding them to the **Land-Based Strategies** site.

---

## 1. Folder Setup

All images for a given project live under:

```
C:\lbswebsite\landbasedstrategies\assets\media\{ProjectName}\
```

Optimized versions go in a subfolder:

```
C:\lbswebsite\landbasedstrategies\assets\media\{ProjectName}\optimized\
```

---

## 2. File Naming Rules

* Use **kebab-case** for filenames

  * Example: `sendero-groundbreaking-2638.webp`
* Avoid spaces, underscores, and mixed case.
* Keep names short but descriptive (include project + context if possible).

---

## 3. Optimization Workflow

### ➤ Optimize a Single Image

```powershell
cd "C:\lbswebsite\landbasedstrategies\assets\media\PearlRiver"

$in  = "SenderoGroundbreaking2638.jpg"
$out = "optimized\sendero-groundbreaking-2638.webp"

magick $in -resize 1600x -quality 80 $out
```

**Notes:**

* `-resize 1600x` → ensures max width = 1600px (aspect ratio preserved).
* `-quality 80` → good balance of sharpness + compression.
* Always output to `.webp`.

---

### ➤ Optimize a Batch of Images

```powershell
cd "C:\lbswebsite\landbasedstrategies\assets\media\PearlRiver"
mkdir -Force optimized

Get-ChildItem *.jpg | ForEach-Object {
    $out = "optimized\$($_.BaseName -replace ' ', '-' -replace '_','-').webp"
    magick $_.FullName -resize 1600x -quality 80 $out
}
```

**Notes:**

* Converts all `.jpg` files in the folder.
* Automatically replaces spaces/underscores with kebab-case in output filenames.

---

## 4. Using Optimized Images in HTML

### Basic `<img>` Example

```html
<img src="/assets/media/PearlRiver/optimized/sendero-groundbreaking-2638.webp"
     alt="Sendero Groundbreaking Ceremony in Bastrop, Texas">
```

### Best Practice `<picture>` Fallback

```html
<picture>
  <source srcset="/assets/media/PearlRiver/optimized/sendero-groundbreaking-2638.webp" type="image/webp">
  <img src="/assets/media/PearlRiver/SenderoGroundbreaking2638.jpg"
       alt="Sendero Groundbreaking Ceremony in Bastrop, Texas">
</picture>
```

---

## 5. Pre-Upload Checklist

* [ ] File renamed in **kebab-case**
* [ ] Optimized `.webp` saved in `/optimized/`
* [ ] Fallback `.jpg` available (if needed)
* [ ] `<picture>` element used in HTML

---

✅ Following this process ensures our images are **fast-loading, SEO-friendly, and consistent** across the site.
