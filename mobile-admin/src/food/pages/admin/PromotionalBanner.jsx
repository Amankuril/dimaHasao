/* Ported from Frontend/src/modules/Food/pages/admin/PromotionalBanner.jsx. */
import { useEffect, useState } from "react";
import { Image as ImageIcon, Upload } from "lucide-react-native";
import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { File } from "expo-file-system";
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_TEXT_PRIMARY,
} from "../../../admin/ui";
import {
  Button,
  Div,
  Form,
  HScroll,
  Img,
  Input,
  P,
  Span,
  Icon as UiIcon,
} from "../../../components/web";
import { pickImage } from "../../../lib/files";
import { alert } from "../../../lib/webShim";
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
      label: "Spanish - español(ES)",
    },
  ];
  const activeLanguageLabel =
    activeLanguage === "default"
      ? "Default"
      : languageTabs.find((t) => t.key === activeLanguage)?.label;
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
    <AdminPage maxWidth={720}>
      <PageHeader
        icon={ImageIcon}
        title="Promotional Banner"
        subtitle="The wide banner shown at the top of the customer app"
        breadcrumb={[
          { label: "Food" },
          { label: "Promotions" },
          { label: "Promotional banner" },
        ]}
      />

      <Card>
        {/* Language Tabs */}
        <HScroll
          className="mb-4 border-b border-slate-200"
          contentClassName="flex-row items-center"
        >
          {languageTabs.map((tab) => (
            <Button
              key={tab.key}
              onClick={() => setActiveLanguage(tab.key)}
              className={`px-4 h-11 justify-center border-b-2 ${activeLanguage === tab.key ? "border-blue-600" : "border-transparent"}`}
            >
              <Span
                className={`text-sm font-semibold ${activeLanguage === tab.key ? "text-blue-600" : "text-slate-600"}`}
              >
                {tab.label}
              </Span>
            </Button>
          ))}
        </HScroll>

        <Form onSubmit={handleSubmit}>
          <Field label={`Title (${activeLanguageLabel})`} className="mb-4">
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={INPUT}
            />
          </Field>

          <SectionTitle>Upload Banner</SectionTitle>

          {/* Banner Preview */}
          <Div className="border border-slate-200 rounded-lg overflow-hidden mb-3">
            <Div
              className="w-full"
              style={{
                aspectRatio: 5,
                minHeight: 140,
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
                <Div className="px-4">
                  <P className="text-base font-bold text-white text-center">
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

          {/* Upload Button */}
          <Button
            onClick={handleBannerUpload}
            className="border border-dashed border-slate-300 rounded-lg py-8 px-4 items-center gap-1 bg-slate-50 mb-2"
            accessibilityLabel="Upload promotional banner image"
          >
            <UiIcon as={Upload} size={28} className="text-slate-400 mb-1" />
            <P className="text-sm font-semibold text-blue-600">
              Click to upload
            </P>
            <P className="text-xs text-slate-500">Or drag and drop</P>
          </Button>

          {/* Upload Instructions */}
          <Div className="gap-1 mb-4">
            <P className="text-xs text-slate-500">
              Min size for better resolution 5:1
            </P>
            <P className="text-xs text-slate-500">
              Image format: jpeg, jpg, png, gif, webp — maximum size 2 MB
            </P>
          </Div>

          <Button type="submit" className={BTN_PRIMARY}>
            <Span className={BTN_TEXT_PRIMARY}>Save</Span>
          </Button>
        </Form>
      </Card>
    </AdminPage>
  );
}
