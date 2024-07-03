import styles from "./index.module.css";

type Props = {
  left?: React.CSSProperties["left"];
  style?: React.CSSProperties;
};

export function TriangleDivider({ left = "25px", style }: Props) {
  return <section className={styles.triangle} style={{ ...style, "--before-left": `${left}%` }} />;
}
