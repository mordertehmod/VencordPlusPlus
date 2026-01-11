import { Heading } from "@components/Heading";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";

interface SectionWrapperProps {
    title: string;
    children: React.ReactNode;
}

export function SectionWrapper({ title, children }: SectionWrapperProps) {
    return (
        <div className={classes("vc-betterui-section-block", Margins.bottom16)}>
            <Heading tag="h3" className={Margins.bottom8}>{title}</Heading>
            {children}
        </div>
    );
}
