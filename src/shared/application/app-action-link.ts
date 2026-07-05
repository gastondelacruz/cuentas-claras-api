export type AppActionLinkQuery = Record<string, string | number | boolean>;

export function buildAppActionLink(baseUrl: string, path: string, query: AppActionLinkQuery): string {
	const normalizedPath = path.replace(/^\/+/, "");
	const queryString = new URLSearchParams(
		Object.entries(query).map(([key, value]) => [key, String(value)]),
	).toString();
	const separator = queryString ? `?${queryString}` : "";

	if (baseUrl.endsWith("://")) {
		return `${baseUrl}${normalizedPath}${separator}`;
	}

	return `${baseUrl.replace(/\/+$/, "")}/${normalizedPath}${separator}`;
}
