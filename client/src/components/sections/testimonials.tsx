import { Star } from "lucide-react";

export default function Testimonials() {
  const testimonials = [
    {
      name: "Sarah A.",
      role: "AP Biology Student",
      avatar: "SA",
      testimonial: "The AI explanations helped me understand complex concepts I was struggling with. My practice test scores improved by 40 points!",
      gradient: "from-sage/5 to-teal/5",
      border: "border-sage/20",
      avatarBg: "bg-teal/10",
      avatarColor: "text-teal"
    },
    {
      name: "Marcus J.",
      role: "AP Calculus Student", 
      avatar: "MJ",
      testimonial: "Finally, a free AP prep tool that actually works! The practice tests feel just like the real exam.",
      gradient: "from-coral/5 to-peach/5",
      border: "border-peach/20",
      avatarBg: "bg-coral/10",
      avatarColor: "text-coral"
    },
    {
      name: "Emily L.",
      role: "AP History Student",
      avatar: "EL", 
      testimonial: "The personalized study plan helped me focus on exactly what I needed to improve. Game changer!",
      gradient: "from-navy/5 to-sage/5",
      border: "border-navy/20",
      avatarBg: "bg-navy/10",
      avatarColor: "text-navy"
    }
  ];

  const stats = [
    {
      number: "500+",
      label: "Beta Users",
      sublabel: "Already preparing for 2026",
      iconBg: "bg-teal/10",
      numberColor: "text-teal"
    },
    {
      number: "95%",
      label: "Score Improvement",
      sublabel: "Average practice test gains",
      iconBg: "bg-coral/10",
      numberColor: "text-coral"
    },
    {
      number: "15+",
      label: "AP Subjects",
      sublabel: "Comprehensive coverage",
      iconBg: "bg-sage/20",
      numberColor: "text-sage"
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">
            Trusted by <span className="text-coral">Future Scholars</span>
          </h2>
          <p className="text-lg text-navy/70">
            Join thousands of students already preparing for success
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial, index) => (
            <div key={index} className={`bg-gradient-to-br ${testimonial.gradient} p-8 rounded-2xl border ${testimonial.border}`}>
              <div className="flex items-center mb-4">
                <div className={`w-12 h-12 ${testimonial.avatarBg} rounded-full flex items-center justify-center mr-4`}>
                  <span className={`${testimonial.avatarColor} font-bold`}>{testimonial.avatar}</span>
                </div>
                <div>
                  <p className="font-semibold text-navy">{testimonial.name}</p>
                  <p className="text-sm text-navy/60">{testimonial.role}</p>
                </div>
              </div>
              <p className="text-navy/70 italic mb-4">
                "{testimonial.testimonial}"
              </p>
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Success Stories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <img 
              src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600" 
              alt="Students celebrating academic success and graduation" 
              className="rounded-2xl shadow-lg w-full h-auto"
            />
          </div>
          <div className="flex flex-col justify-center">
            <h3 className="text-2xl font-bold text-navy mb-6">Success Stories</h3>
            <div className="space-y-4">
              {stats.map((stat, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className={`w-16 h-16 ${stat.iconBg} rounded-2xl flex items-center justify-center`}>
                    <span className={`text-2xl font-bold ${stat.numberColor}`}>{stat.number}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-navy">{stat.label}</p>
                    <p className="text-sm text-navy/60">{stat.sublabel}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}