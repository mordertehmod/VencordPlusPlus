import { BaseText } from "@components/BaseText";
import { Button } from "@components/Button";
import { Flex } from "@components/Flex";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import { Paragraph } from "@components/Paragraph";
import { Forms, React, useCallback, useEffect, useMemo, useState } from "@webpack/common";

import { CustomStreamPreviewState } from "../state";
import { imageFileToStreamPreview, sendCustomPreview, stopSendingScreenSharePreview } from "../utilities";
import { Divider } from "@components/Divider";

export function ScreenSharePreviewImageModal({ modalProps, close }: { modalProps: ModalProps; close: () => void; }) {
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isStreamPreviewSending, setIsStreamPreviewSending] = useState(() => {
        return CustomStreamPreviewState
            .getState()
            .isSendingCustomStreamPreview;
    });

    useEffect(() => {
        return CustomStreamPreviewState.subscribeToField(
            "isSendingCustomStreamPreview",
            setIsStreamPreviewSending
        );
    }, []);

    const uploadButtonDisabled = useMemo(() => previewImage === null, [previewImage]);

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }

        const base64 = await imageFileToStreamPreview(file);
        setPreviewImage(base64);
    }, []);

    const uploadButtonOnClick = useCallback(() => {
        if (previewImage) {
            sendCustomPreview(previewImage);
        }
        close();
    }, [previewImage, close]);

    const stopReUploadPreviewButtonOnClick = useCallback(() => {
        stopSendingScreenSharePreview();
        close();
    }, [close]);

    const uploadImageButtonOnClick = useCallback(() => {
        const input = document.getElementById("screen-share-preview-image-upload") as HTMLInputElement;
        if (input) {
            input.click();
        }
    }, []);

    return (
        <ModalRoot {...modalProps} size={ModalSize.SMALL}>
            <ModalHeader>
                <BaseText style={{ flexGrow: 1 }}>Screen Share Preview</BaseText>
                <ModalCloseButton onClick={close}/>
            </ModalHeader>

            <ModalContent>
                <Paragraph>
                    Select an image to use it as your screen share preview.
                </Paragraph>

                <br/>

                <Paragraph>
                    NOTE: Important to enable "Hide stream preview" in the stream settings.
                    Otherwise, the custom stream preview will not be shown.
                </Paragraph>

                <br/>

                <Paragraph>
                    NOTE: Stream preview images can be updated only once every 60 seconds. This is a Discord limitation.
                </Paragraph>

                <Button
                    style={{ marginTop: "1rem", marginBottom: "1rem" }}
                    onClick={uploadImageButtonOnClick}
                >
                    Select Image
                </Button>
                <input
                    id="screen-share-preview-image-upload"
                    style={{ display: "none" }}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                />

                {previewImage && (
                    <>
                        <Divider style={{ marginTop: "1rem", marginBottom: "1rem" }}/>

                        <img
                            src={previewImage}
                            alt="Preview"
                            style={{ marginTop: "1rem", marginBottom: "1rem", maxWidth: "100%" }}
                        />
                    </>
                )}
            </ModalContent>

            <ModalFooter>
                <Flex style={{ width: "100%", flexDirection: "row", justifyContent: "space-between" }}>
                    {isStreamPreviewSending && (
                        <Button
                            disabled={!isStreamPreviewSending}
                            color={"danger"}
                            onClick={stopReUploadPreviewButtonOnClick}
                        >
                            Stop Re-Uploading Preview
                        </Button>
                    )}

                    <Button
                        style={{ marginLeft: "auto" }}
                        disabled={uploadButtonDisabled}
                        onClick={uploadButtonOnClick}
                    >
                        Upload
                    </Button>
                </Flex>
            </ModalFooter>
        </ModalRoot>
    );
}
