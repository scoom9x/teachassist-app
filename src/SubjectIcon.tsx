import {
  BookOpen,
  Calculator,
  FlaskConical,
  Landmark,
  Globe,
  Languages,
  Dumbbell,
  Palette,
  Music,
  Drama,
  Monitor,
  Wrench,
  Briefcase,
  Heart,
  Compass,
} from "lucide-react";
export function SubjectIcon({
  code,
  size = 21,
}: {
  code: string;
  size?: number;
}) {
  const prefix = code.toUpperCase();
  const Icon = prefix.startsWith("M")
    ? Calculator
    : prefix.startsWith("S")
      ? FlaskConical
      : prefix.startsWith("CH")
        ? Landmark
        : prefix.startsWith("CG")
          ? Globe
          : prefix.startsWith("F") || prefix.startsWith("L")
            ? Languages
            : prefix.startsWith("P")
              ? Dumbbell
              : prefix.startsWith("AM")
                ? Music
                : prefix.startsWith("AD")
                  ? Drama
                  : prefix.startsWith("A")
                    ? Palette
                    : prefix.startsWith("IC") || prefix.startsWith("TE")
                      ? Monitor
                      : prefix.startsWith("T")
                        ? Wrench
                        : prefix.startsWith("B")
                          ? Briefcase
                          : prefix.startsWith("H")
                            ? Heart
                            : prefix.startsWith("G")
                              ? Compass
                              : BookOpen;
  return <Icon size={size} aria-hidden="true" />;
}
