import { useEffect, useState } from "react"
import { Edit, Upload, Info } from "lucide-react"
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}

// Using placeholder for promotional banner
const bannerPreview = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=400&fit=crop"

export default function PromotionalBanner() {
  const [activeLanguage, setActiveLanguage] = useState("default")
  const [title, setTitle] = useState("Promotional")
  const [bannerImage, setBannerImage] = useState(bannerPreview)

  useEffect(() => {
    try {
      const saved = localStorage.getItem("admin_promotional_banner")
      if (!saved) return
      const parsed = JSON.parse(saved)
      if (parsed?.title) setTitle(parsed.title)
      if (parsed?.activeLanguage) setActiveLanguage(parsed.activeLanguage)
      if (parsed?.bannerImage) setBannerImage(parsed.bannerImage)
    } catch (error) {
      debugError("Failed to load saved promotional banner:", error)
    }
  }, [])

  const languageTabs = [
    { key: "default", label: "Default" },
    { key: "en", label: "English(EN)" },
    { key: "bn", label: "Bengali - বাংলা(BN)" },
    { key: "ar", label: "Arabic - العربية (AR)" },
    { key: "es", label: "Spanish - espa�ol(ES)" },
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    localStorage.setItem(
      "admin_promotional_banner",
      JSON.stringify({
        title,
        activeLanguage,
        bannerImage,
        updatedAt: new Date().toISOString(),
      }),
    )
    alert("Promotional banner saved successfully!")
  }

  const handleBannerUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      alert("Image size must be 2MB or less")
      event.target.value = ""
      return
    }

    const reader = new FileReader()
    reader.onload = () => setBannerImage(String(reader.result || bannerPreview))
    reader.readAsDataURL(file)
  }

  return (
    <div className="p-4 lg:p-6 bg-neutral-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Edit className="w-5 h-5 text-neutral-600" />
            <h1 className="text-2xl font-medium text-neutral-900">Promotional banner</h1>
          </div>

          {/* Language Tabs */}
          <div className="flex items-center gap-2 border-b border-neutral-200 mb-6">
            {languageTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveLanguage(tab.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeLanguage === tab.key
                    ? "border-[#0a4d2b] text-[#0a4d2b]"
                    : "border-transparent text-neutral-600 hover:text-neutral-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Title Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Title ({activeLanguage === "default" ? "Default" : languageTabs.find(t => t.key === activeLanguage)?.label})
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400 text-sm"
              />
            </div>

            {/* Upload Banner Section */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-lg font-medium text-neutral-900">Upload banner</h2>
                <Info className="w-4 h-4 text-neutral-400" />
              </div>

              {/* Banner Preview */}
              <div className="border-2 border-neutral-200 rounded-lg overflow-hidden mb-4">
                <div className="relative w-full" style={{ aspectRatio: "5/1", minHeight: "200px" }}>
                  <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
                    <div className="text-white text-center px-8">
                      <p className="text-2xl font-medium mb-2">Fresh flavors delivered right to you</p>
                    </div>
                  </div>
                  <div className="absolute right-0 top-0 bottom-0 w-1/2">
                    <img
                      src={bannerImage}
                      alt="Banner preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none"
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Upload Instructions */}
              <div className="text-sm text-neutral-600 space-y-1">
                <p>Min Size for Better Resolution 5:1</p>
                <p>Image format: jpeg, jpg, png, gif, webp | maximum size: 2 MB</p>
              </div>

              {/* Upload Button */}
              <div className="mt-4">
                <label className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center hover:border-[#0a4d2b] transition-colors cursor-pointer block">
                  <Upload className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-[#0a4d2b] mb-1">Click to upload</p>
                  <p className="text-xs text-neutral-500">Or drag and drop</p>
                  <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 text-sm font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors shadow-sm"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

