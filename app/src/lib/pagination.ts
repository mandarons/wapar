export const RECENT_PAGE_SIZE = 20;

export interface PaginationState {
	offset: number;
	pageSize: number;
	total: number;
}

export interface PaginationInfo {
	currentPage: number;
	totalPages: number;
	prevOffset: number | null;
	nextOffset: number | null;
	startIndex: number;
	endIndex: number;
}

export function getPaginationInfo(state: PaginationState): PaginationInfo {
	const { offset, pageSize, total } = state;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const currentPage = Math.min(Math.floor(offset / pageSize) + 1, totalPages);
	const prevOffset = offset > 0 ? Math.max(0, offset - pageSize) : null;
	const nextOffset = offset + pageSize < total ? offset + pageSize : null;
	const startIndex = Math.min(offset + 1, total);
	const endIndex = Math.min(offset + pageSize, total);

	return {
		currentPage,
		totalPages,
		prevOffset,
		nextOffset,
		startIndex,
		endIndex
	};
}
