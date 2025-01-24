import enTranslations from "@shopify/polaris/locales/en.json";
import "@shopify/polaris/build/esm/styles.css";
import {
  AppProvider,
  Button,
  ButtonGroup,
  Frame,
  FormLayout,
  Checkbox,
  InlineStack,
  BlockStack,
  Page,
  Thumbnail,
  TextField,
  Toast,
  Card,
} from "@shopify/polaris";
import { PageDownIcon, ClipboardIcon } from "@shopify/polaris-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import parseDataURL from "data-urls";

const base64ImgSelector = 'img[src^="data:image/"],svg image';

export default function Home() {
  const [copiedActive, setCopiedActive] = useState(false);
  const [code, setCode] = useState("");
  const [dom, setDom] = useState(null);
  const [images, setImages] = useState(null);
  const [error, setError] = useState(null);
  const onChange = useCallback(
    function (value) {
      setCode(value);
    },
    [code],
  );
  useEffect(
    function () {
      try {
        setError(null);
        const parser = new DOMParser();
        const dom = parser.parseFromString(code, "text/html");
        const images = Array.from(dom.querySelectorAll(base64ImgSelector))
          .map((img, idx) => {
            let lookups = [
              [null, "src"],
              ["http://www.w3.org/1999/xlink", "href"],
            ];
            let attr = lookups.find((attr) => img.getAttributeNS(...attr));
            if (!attr) {
              return null;
            }
            let src = img.getAttributeNS(...attr);
            if (!src) {
              return null;
            }
            const url = parseDataURL(src);
            if (!url) {
              return null;
            }
            return {
              id: idx,
              attr,
              tag: img.tagName,
              name: `file-${idx + 1}.${url.mimeType.subtype}`,
              src,
              lazyLoad: img.tagName == "IMG",
            };
          })
          .filter(Boolean);
        setImages(images);
        setDom(dom);
      } catch (error) {
        setError(String(error));
      }
    },
    [code],
  );
  const result = useMemo(
    function () {
      if (dom == null) {
        return "";
      }
      const clonedNode = dom.cloneNode(true);
      clonedNode.querySelectorAll(base64ImgSelector).forEach((el) => {
        let img = images.find(
          (img) => img.src == el.getAttributeNS(...img.attr),
        );
        if (!img) {
          return;
        }
        if (img.lazyLoad) {
          el.setAttribute("loading", "lazy");
        }
        el.setAttributeNS(...img.attr, `{{ '${img.name}' | file_img_url }}`);
      });
      return clonedNode.body.innerHTML;
    },
    [dom, images],
  );
  const updateLazyload = (id, newValue) => {
    setImages((prevImages) =>
      prevImages.map((img) =>
        img.id !== id
          ? img
          : {
            ...img,
            lazyLoad: newValue,
          },
      ),
    );
  };
  const updateName = (id, newValue) => {
    setImages((prevImages) =>
      prevImages.map((img) =>
        img.id !== id
          ? img
          : {
            ...img,
            name: newValue,
          },
      ),
    );
  };
  const copyGeneratedCode = async () => {
    await navigator.clipboard.writeText(result);
    setCopiedActive(true);
  };
  return (
    <AppProvider i18n={enTranslations}>
      <Frame>
        <Page fullWidth title="Extract Base64 images">
          {copiedActive && (
            <Toast
              content="Copied generated code."
              duration={4000}
              onDismiss={() => setCopiedActive(false)}
            />
          )}
          <Card sectioned>
            <BlockStack align="start" gap={"200"}>
              <TextField
                label="HTML Content"
                type="text"
                value={code}
                onChange={onChange}
                multiline={true}
                maxHeight={`16em`}
                inputMode="text"
                error={error}
                helpText="Extract base64 images and replace data url."
                autoComplete="text"
              />
              {result && (
                <>
                  <TextField
                    label={"Generated HTML Content"}
                    value={result}
                    multiline={true}
                  />
                  <InlineStack align="end">
                    <ButtonGroup>
                      <Button icon={ClipboardIcon} onClick={copyGeneratedCode}>
                        Copy
                      </Button>
                    </ButtonGroup>
                  </InlineStack>
                  {images.map((img) => (
                    <>
                      <Thumbnail source={img.src} size="large" alt={img.name} />
                      <FormLayout>
                        <FormLayout.Group>
                          <TextField
                            value={img.name}
                            label={"File name"}
                            onChange={(value) => updateName(img.id, value)}
                          />
                        </FormLayout.Group>
                        {img.tag == "IMG" ? (
                          <FormLayout.Group>
                            <Checkbox
                              label="Lazy load"
                              checked={img.lazyLoad}
                              onChange={(checked) =>
                                updateLazyload(img.id, checked)
                              }
                            />
                          </FormLayout.Group>
                        ) : null}
                      </FormLayout>
                      <InlineStack align="end">
                        <ButtonGroup>
                          <Button
                            icon={PageDownIcon}
                            url={img.src}
                            download={img.name}
                          >
                            Download
                          </Button>
                        </ButtonGroup>
                      </InlineStack>
                    </>
                  ))}
                </>
              )}
            </BlockStack>
          </Card>
        </Page>
      </Frame>
    </AppProvider>
  );
}
