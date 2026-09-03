export default function JsonBlock({ value }: { value: unknown }) {
  return <pre>{value !== undefined ? JSON.stringify(value, null, 2) : ""}</pre>;
}
