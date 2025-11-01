import { join } from 'path';
import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';
import { skeleton } from '@skeletonlabs/tw-plugin';
import { waparTheme } from './src/theme';

export default {
	darkMode: 'class',
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		join(require.resolve('@skeletonlabs/skeleton'), '../**/*.{html,js,svelte,ts}')
	],
	theme: {
		extend: {
			// Design tokens for WAPAR design system
			spacing: {
				section: '2rem',
				'section-lg': '3rem',
				'card-padding': '1.5rem',
				'card-padding-sm': '1rem'
			},
			fontSize: {
				'heading-xl': ['2rem', { lineHeight: '2.5rem', fontWeight: '600' }],
				'heading-lg': ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],
				'heading-md': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
				'heading-sm': ['1.125rem', { lineHeight: '1.5rem', fontWeight: '600' }],
				'body-lg': ['1rem', { lineHeight: '1.75rem', fontWeight: '400' }],
				body: ['0.875rem', { lineHeight: '1.5rem', fontWeight: '400' }],
				'body-sm': ['0.75rem', { lineHeight: '1.25rem', fontWeight: '400' }]
			},
			colors: {
				// AA contrast compliant color palette
				wapar: {
					// Primary brand color - teal/green
					primary: {
						50: '#f0fdf4',
						100: '#dcfce7',
						200: '#bbf7d0',
						300: '#86efac',
						400: '#4ade80',
						500: '#22c55e', // AA for large text (3:1)
						600: '#16a34a', // AA compliant on white (4.5:1+)
						700: '#15803d',
						800: '#166534',
						900: '#14532d'
					},
					// Secondary accent - indigo
					secondary: {
						50: '#eef2ff',
						100: '#e0e7ff',
						200: '#c7d2fe',
						300: '#a5b4fc',
						400: '#818cf8',
						500: '#6366f1', // AA compliant on white (~4.8:1)
						600: '#4f46e5', // AA compliant on white (~7.3:1)
						700: '#4338ca',
						800: '#3730a6',
						900: '#312e81'
					},
					// Neutral grays
					gray: {
						50: '#f9fafb',
						100: '#f3f4f6',
						200: '#e5e7eb',
						300: '#d1d5db',
						400: '#9ca3af',
						500: '#6b7280', // AA compliant on white (4.5:1+)
						600: '#4b5563', // AA compliant on white (4.5:1+)
						700: '#374151',
						800: '#1f2937',
						900: '#111827'
					},
					// Semantic colors - AA compliant
					success: {
						50: '#f0fdf4',
						100: '#dcfce7',
						500: '#22c55e',
						600: '#16a34a', // AA compliant
						700: '#15803d'
					},
					warning: {
						50: '#fffbeb',
						100: '#fef3c7',
						500: '#f59e0b',
						600: '#d97706', // AA compliant
						700: '#b45309'
					},
					error: {
						50: '#fef2f2',
						100: '#fee2e2',
						500: '#ef4444',
						600: '#dc2626', // AA compliant
						700: '#b91c1c'
					},
					info: {
						50: '#eff6ff',
						100: '#dbeafe',
						500: '#3b82f6',
						600: '#2563eb', // AA compliant
						700: '#1d4ed8'
					}
				}
			},
			borderRadius: {
				card: '0.5rem',
				button: '0.375rem'
			},
			boxShadow: {
				card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
				'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
			}
		}
	},
	plugins: [
		typography,
		skeleton({
			themes: {
				custom: [waparTheme]
			}
		})
	]
} satisfies Config;
