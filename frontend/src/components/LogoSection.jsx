import { Menu } from 'lucide-react'

const LogoSection = ({ onOpenSidebar, className }) => {
    return (
        <div className={`w-full flex justify-between items-center px-2 py-1 ${className}`}>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={onOpenSidebar}
                    className="ml-2 hidden h-10 w-10 items-center justify-center rounded-[12px] bg-white/5 text-white transition hover:bg-white/10 sm:inline-flex lg:hidden"
                    title="Open Menu"
                >
                    <Menu className="h-5 w-5" />
                </button>
                <img
                    src="/images/chattiko-linear.png"
                    alt="logo"
                    width={210}
                    className="max-h-[60px] sm:max-h-[75px] object-cover"
                />
            </div>
        </div>
    )
}

export default LogoSection
