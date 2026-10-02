import { achievements } from '../data/profile'

export default function Achievements() {
	return (
		<section id="achievements">
			<article className="content">
				<h2>#Достижения</h2>
				<ul>
					{achievements.map((item) => (
						<li key={item}>{item}</li>
					))}
				</ul>
			</article>
		</section>
	)
}
