import { describe, it, expect } from 'vitest';
import { getPaginationInfo, RECENT_PAGE_SIZE } from './pagination';
import type { PaginationState } from './pagination';

describe('getPaginationInfo', () => {
	it('should return first page when offset is 0', () => {
		const state: PaginationState = { offset: 0, pageSize: 20, total: 100 };
		const info = getPaginationInfo(state);

		expect(info.currentPage).toBe(1);
		expect(info.totalPages).toBe(5);
		expect(info.prevOffset).toBeNull();
		expect(info.nextOffset).toBe(20);
		expect(info.startIndex).toBe(1);
		expect(info.endIndex).toBe(20);
	});

	it('should return middle page', () => {
		const state: PaginationState = { offset: 40, pageSize: 20, total: 100 };
		const info = getPaginationInfo(state);

		expect(info.currentPage).toBe(3);
		expect(info.totalPages).toBe(5);
		expect(info.prevOffset).toBe(20);
		expect(info.nextOffset).toBe(60);
		expect(info.startIndex).toBe(41);
		expect(info.endIndex).toBe(60);
	});

	it('should return last page', () => {
		const state: PaginationState = { offset: 80, pageSize: 20, total: 100 };
		const info = getPaginationInfo(state);

		expect(info.currentPage).toBe(5);
		expect(info.totalPages).toBe(5);
		expect(info.prevOffset).toBe(60);
		expect(info.nextOffset).toBeNull();
		expect(info.startIndex).toBe(81);
		expect(info.endIndex).toBe(100);
	});

	it('should handle total less than pageSize', () => {
		const state: PaginationState = { offset: 0, pageSize: 20, total: 5 };
		const info = getPaginationInfo(state);

		expect(info.currentPage).toBe(1);
		expect(info.totalPages).toBe(1);
		expect(info.prevOffset).toBeNull();
		expect(info.nextOffset).toBeNull();
		expect(info.startIndex).toBe(1);
		expect(info.endIndex).toBe(5);
	});

	it('should handle total of 0', () => {
		const state: PaginationState = { offset: 0, pageSize: 20, total: 0 };
		const info = getPaginationInfo(state);

		expect(info.currentPage).toBe(1);
		expect(info.totalPages).toBe(1);
		expect(info.prevOffset).toBeNull();
		expect(info.nextOffset).toBeNull();
		expect(info.startIndex).toBe(0);
		expect(info.endIndex).toBe(0);
	});

	it('should clamp offset to valid range (past end)', () => {
		const state: PaginationState = { offset: 200, pageSize: 20, total: 50 };
		const info = getPaginationInfo(state);

		expect(info.currentPage).toBe(3);
		expect(info.totalPages).toBe(3);
		expect(info.prevOffset).toBe(180);
		expect(info.nextOffset).toBeNull();
	});

	it('should handle non-evenly divisible total', () => {
		const state: PaginationState = { offset: 0, pageSize: 20, total: 45 };
		const info = getPaginationInfo(state);

		expect(info.totalPages).toBe(3);
		expect(info.startIndex).toBe(1);
		expect(info.endIndex).toBe(20);
	});

	it('should handle last partial page', () => {
		const state: PaginationState = { offset: 40, pageSize: 20, total: 45 };
		const info = getPaginationInfo(state);

		expect(info.currentPage).toBe(3);
		expect(info.startIndex).toBe(41);
		expect(info.endIndex).toBe(45);
		expect(info.nextOffset).toBeNull();
	});

	it('should return default pageSize from constant', () => {
		expect(RECENT_PAGE_SIZE).toBe(20);
	});
});
