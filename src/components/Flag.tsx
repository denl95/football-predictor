import { toFlagCode } from "@/lib/football-data";

export function Flag({
	name,
	className,
}: {
	name: string | null;
	className?: string;
}) {
	const code = toFlagCode(name);
	if (!code) return null;
	const cls = className ? `fi fi-${code} ${className}` : `fi fi-${code}`;
	return <span aria-hidden="true" className={cls} />;
}
