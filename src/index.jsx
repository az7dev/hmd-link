import { h, render } from 'preact'

import styled from 'styled-components'
import { useDummyUser } from 'hooks-dummy'

import 'mini.css/dist/mini-dark.min.css'
import 'style.css'
import { Header } from 'components/Header'
import { Content } from 'components/Content'
import { StatusChip } from 'components/StatusChip'

const sleep = ms => new Promise(r => setTimeout(r, ms))

const MarginContainer = styled.div`
	margin-bottom: 6em;
`

const Container = ({children}) => {
	return (
		<MarginContainer className="container">
			<div class="row" >
				<div class="col-sm-12 col-md-8 col-lg-6 col-md-offset-2 col-lg-offset-3">
					{ children }
				</div>
			</div>
		</MarginContainer>
	)
}

const App = () => {
	const user = useDummyUser(1000);
	return(
		<Container>
			<Header />
			<Content user={user}/>
			<StatusChip user={user} />
		</Container>
	)
}



render(<App />, document.body);