import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Pitch from "@/components/Pitch";
import ComparisonTable from "@/components/ComparisonTable";
import BottomCTA from "@/components/BottomCTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Pitch />
        <ComparisonTable />
        <BottomCTA />
      </main>
      <Footer />
    </>
  );
}
