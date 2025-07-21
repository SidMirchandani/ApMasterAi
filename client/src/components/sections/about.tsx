export default function About() {
  return (
    <section id="about" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-navy mb-6">
              Our <span className="text-teal">Mission</span>
            </h2>
            <p className="text-lg text-navy/70 mb-6 leading-relaxed">
              We believe that every student deserves access to high-quality AP test preparation, regardless of their economic background. APMaster.ai combines cutting-edge AI technology with proven educational methodologies to democratize test prep.
            </p>
            <p className="text-lg text-navy/70 mb-8 leading-relaxed">
              Our platform mimics the structure of College Board practice, incorporates the community feel of study groups, and leverages the intelligence of AI to create a personalized, engaging, and effective learning environment.
            </p>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-teal/5 to-sage/5 rounded-xl">
                <div className="text-2xl font-bold text-teal mb-2">Jan 2026</div>
                <div className="text-sm text-navy/60">Beta Launch</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-coral/5 to-peach/5 rounded-xl">
                <div className="text-2xl font-bold text-coral mb-2">May 2026</div>
                <div className="text-sm text-navy/60">Full Launch</div>
              </div>
            </div>
          </div>
          <div>
            <img 
              src="https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600" 
              alt="Diverse students collaborating on studies with laptops and tablets" 
              className="rounded-2xl shadow-2xl w-full h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}