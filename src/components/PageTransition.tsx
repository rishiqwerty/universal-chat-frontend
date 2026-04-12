import { motion } from "framer-motion";
import { ReactNode } from "react";

type PageTransitionProps = {
  children: ReactNode;
};

export default function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ 
        duration: 0.35, 
        ease: [0.22, 1, 0.36, 1] // Custom cubic-bezier for a more "designed" feel
      }}
      className="flex flex-1 flex-col min-h-0"
    >
      {children}
    </motion.div>
  );
}
