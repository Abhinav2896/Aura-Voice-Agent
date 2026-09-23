'use client';

import Image from 'next/image';
import { PRACTICE } from '@/lib/constants';

export function PatientFooter() {
  return (
    <footer className="border-t border-gray-100 bg-white/50 mt-12">
      <div className="max-w-[1400px] mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Practice identity */}
        <div className="flex items-center gap-2">
          <Image src="/assets/footer-heart.svg" alt="" width={20} height={20} className="opacity-50" />
          <div>
            <p className="text-sm font-semibold text-gray-700">{PRACTICE.name}</p>
            <p className="text-xs text-gray-400">{PRACTICE.footerTagline}</p>
          </div>
        </div>

        {/* Center: Legal links */}
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <a href="#privacy" className="hover:text-gray-600 transition-colors">Privacy</a>
          <span>|</span>
          <a href="#terms" className="hover:text-gray-600 transition-colors">Terms</a>
          <span>|</span>
          <a href="#accessibility" className="hover:text-gray-600 transition-colors">Accessibility</a>
        </div>

        {/* Right: Aura branding */}
        <div className="flex items-center gap-2">
          <Image src="/assets/footer-logo.svg" alt="Aura" width={20} height={20} />
          <div className="text-right">
            <p className="text-xs text-gray-500">
              Powered by <span className="font-semibold text-gray-700">Aura AI</span>
            </p>
            <p className="text-[10px] text-gray-400">Built for a healthier tomorrow</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
