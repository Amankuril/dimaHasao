/* Ported from Frontend/src/modules/Food/pages/admin/PromotionalBanner.jsx. */
import { useEffect, useState } from "react";
import { Edit, Upload, Info } from "lucide-react-native";
import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { File } from "expo-file-system";
import {
  Button,
  Div,
  Form,
  H1,
  H2,
  HScroll,
  Img,
  Input,
  Label,
  P,
  ScrollDiv,
  Icon as UiIcon,
} from "../../../components/web";
import { pickImage } from "../../../lib/files";
import { alert } from "../../../lib/webShim";
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};

// Using placeholder for promotional banner
const bannerPreview =
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=400&fit=crop";
export default function PromotionalBanner() {
  const [activeLanguage, setActiveLanguage] = useState("default");
  const [title, setTitle] = useState("Promotional");
  const [bannerImage, setBannerImage] = useState(bannerPreview);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [bannerImage]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("admin_promotional_banner");
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed?.title) setTitle(parsed.title);
      if (parsed?.activeLanguage) setActiveLanguage(parsed.activeLanguage);
      if (parsed?.bannerImage) setBannerImage(parsed.bannerImage);
    } catch (error) {
      debugError("Failed to load saved promotional banner:", error);
    }
  }, []);
  const languageTabs = [
    {
      key: "default",
      label: "Default",
    },
    {
      key: "en",
      label: "English(EN)",
    },
    {
      key: "bn",
      label: "Bengali - বাংলা(BN)",
    },
    {
      key: "ar",
      label: "Arabic - العربية (AR)",
    },
    {
      key: "es",
      label: "Spanish - espa�ol(ES)",
    },
  ];
  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem(
      "admin_promotional_banner",
      JSON.stringify({
        title,
        activeLanguage,
        bannerImage,
        updatedAt: new Date().toISOString(),
      }),
    );
    alert("Promotional banner saved successfully!");
  };
  const handleBannerUpload = async () => {
    const file = await pickImage({ compress: false });
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Image size must be 2MB or less");
      return;
    }
    try {
      const base64 = await new File(file.uri).base64();
      setBannerImage(
        `data:${file.type || "image/jpeg"};base64,${base64}` || bannerPreview,
      );
    } catch (error) {
      debugError("Failed to read promotional banner image:", error);
    }
  };
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-5xl mx-auto">
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {/* Header */}
          <Div className="flex items-center gap-3 mb-6">
            <UiIcon as={Edit} className="w-5 h-5 text-slate-600" />
            <H1 className="text-2xl font-bold text-slate-900">
              Promotional Banner
            </H1>
          </Div>

          {/* Language Tabs */}
          <HScroll className="flex items-center gap-2 border-b border-slate-200 mb-6">
            {languageTabs.map((tab) => (
              <Button
                key={tab.key}
                onClick={() => setActiveLanguage(tab.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeLanguage === tab.key ? "border-blue-600 text-blue-600" : "border-transparent text-slate-600 hover:text-slate-900"}`}
              >
                {tab.label}
              </Button>
            ))}
          </HScroll>

          <Form onSubmit={handleSubmit}>
            {/* Title Input */}
            <Div className="mb-6">
              <Label className="block text-sm font-semibold text-slate-700 mb-2">
                Title (
                {activeLanguage === "default"
                  ? "Default"
                  : languageTabs.find((t) => t.key === activeLanguage)?.label}
                )
              </Label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </Div>

            {/* Upload Banner Section */}
            <Div className="mb-6">
              <Div className="flex items-center gap-2 mb-3">
                <H2 className="text-lg font-semibold text-slate-900">
                  Upload Banner
                </H2>
                <UiIcon as={Info} className="w-4 h-4 text-slate-400" />
              </Div>

              {/* Banner Preview */}
              <Div className="border-2 border-slate-200 rounded-lg overflow-hidden mb-4">
                <Div
                  className="relative w-full"
                  style={{
                    aspectRatio: 5,
                    minHeight: 200,
                  }}
                >
                  <LinearGradient
                    colors={["#1e293b", "#0f172a"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      StyleSheet.absoluteFill,
                      { alignItems: "center", justifyContent: "center" },
                    ]}
                  >
                    <Div className="text-white text-center px-8">
                      <P className="text-2xl font-bold mb-2">
                        Fresh Flavors Delivered Right to You
                      </P>
                    </Div>
                  </LinearGradient>
                  <Div className="absolute right-0 top-0 bottom-0 w-1/2">
                    {!imageFailed && (
                      <Img
                        src={bannerImage}
                        alt="Banner preview"
                        className="w-full h-full object-cover"
                        onError={() => setImageFailed(true)}
                      />
                    )}
                  </Div>
                </Div>
              </Div>

              {/* Upload Instructions */}
              <Div className="text-sm text-slate-600 space-y-1">
                <P>Min Size for Better Resolution 5:1</P>
                <P>
                  Image format: jpeg, jpg, png, gif, webp | maximum size: 2 MB
                </P>
              </Div>

              {/* Upload Button */}
              <Div className="mt-4">
                <Div
                  onClick={handleBannerUpload}
                  className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer block"
                >
                  <UiIcon
                    as={Upload}
                    className="w-12 h-12 text-slate-400 mx-auto mb-3"
                  />
                  <P className="text-sm font-medium text-blue-600 mb-1">
                    Click to upload
                  </P>
                  <P className="text-xs text-slate-500">Or drag and drop</P>
                </Div>
              </Div>
            </Div>

            {/* Save Button */}
            <Div className="flex items-center justify-end">
              <Button
                type="submit"
                className="px-6 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md"
              >
                Save
              </Button>
            </Div>
          </Form>
        </Div>
      </Div>
    </ScrollDiv>
  );
}
