import { skills } from '../data/profile'

export default function Skills() {
	return (
		<section id="skills">
			<article className="content">
				<h2>#Навыки</h2>
				<div className="tags">
					{skills.map((skill) => (
						<div key={skill}>{skill}</div>
					))}
				</div>
			</article>
		</section>
	)
}
