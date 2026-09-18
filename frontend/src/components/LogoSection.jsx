import { Menu } from 'lucide-react'

const LogoSection = ({ onOpenSidebar }) => {
    return (
        <div className="w-full flex justify-between items-center px-2 py-1">
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={onOpenSidebar}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/5 text-white transition hover:bg-white/10 lg:hidden ml-2"
                    title="Open Menu"
                >
                    <Menu className="h-5 w-5" />
                </button>
                <img
                    src="/images/chattiko-linear.png"
                    alt="logo"
                    width={210}
                    className="max-h-[75px] object-cover"
                />
            </div>
        </div>
    )
}

export default LogoSection