import styles from "./styles.modules.css";
import clsx from "clsx";

export function Card({ children, className = "" }) {
  return <div className={clsx(className, styles.foo)}>{children}</div>;
}
