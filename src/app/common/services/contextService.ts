module meshAdminUi {

    /**
     * The contextService allows app-wide communication of the current project & tag which is
     * being viewed by the user. The purpose is to facilitate context-aware searching and creation of objects.
     */
    export class ContextService {
        private currentProject: IProject = <IProject>{};
        private currentNode: INode = <INode>{};
        private queueCallback = false;
        
        constructor(private dispatcher: Dispatcher) {

        }

        /**
         * Set the current project and invoke any registered handlers
         */
        public setProject(project: IProject = <IProject>{}) {
            this.currentProject = project;
            this.dispatchChangeEvent();
        }

        /**
         * Get the current project object.
         */
        public getProject(): IProject {
            return this.currentProject;
        }

        public setCurrentNode(node: INode = <INode>{}) {
            this.currentNode = node;
            this.dispatchChangeEvent();
        }

        public getCurrentNode(): INode {
            return this.currentNode;
        }

        /**
         * Invoke any registered context change handlers and pass each one the
         * current project and tag objects.
         *
         * A timeout is used to ensure that the callbacks are only invoked once per
         * event loop. Thus, even if this runContextChangeHandlers() public is called
         * several times during the event loop, all those calls will only result in the
         * registered callbacks being invoked exactly once.
         */
        private dispatchChangeEvent() {
            if (!this.queueCallback) {
                this.queueCallback = true;

                setTimeout(() => {
                    this.dispatcher.publish(this.dispatcher.events.contextChanged, this.currentProject, this.currentNode);
                    this.queueCallback = false;
                }, 0);
            }
        }
    }
    
    angular.module('meshAdminUi.common')
            .service('contextService', ContextService);

}